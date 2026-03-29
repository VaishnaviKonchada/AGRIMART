function normalizeCommodityName(rawCommodity) {
  const raw = (rawCommodity || '').toString().trim();
  if (!raw) return '';
  return raw
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

async function fetchMandiRecords(apiKey, commodity, state) {
  const url = new URL('https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24');
  url.searchParams.set('api-key', apiKey);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '20');
  url.searchParams.set('filters[Commodity]', commodity);
  if (state) url.searchParams.set('filters[State]', state);
  url.searchParams.set('sort[Arrival_Date]', 'desc');

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Govt API returned HTTP ${res.status}`);

  const data = await res.json();
  return Array.isArray(data.records) ? data.records : [];
}

function summariseRecords(records) {
  const first = records[0];
  const latestDate = first.Arrival_Date;
  const latestRecords = records.filter((record) => record.Arrival_Date === latestDate);
  const modalPrices = latestRecords.map((record) => parseFloat(record.Modal_Price)).filter((price) => !isNaN(price) && price > 0);
  const minPrices = latestRecords.map((record) => parseFloat(record.Min_Price)).filter((price) => !isNaN(price) && price > 0);
  const maxPrices = latestRecords.map((record) => parseFloat(record.Max_Price)).filter((price) => !isNaN(price) && price > 0);
  const avg = (values) => values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  const modalPricePerQuintal = avg(modalPrices) ?? parseFloat(first.Modal_Price);
  const minPricePerQuintal = avg(minPrices) ?? parseFloat(first.Min_Price);
  const maxPricePerQuintal = avg(maxPrices) ?? parseFloat(first.Max_Price);

  return {
    found: true,
    commodity: first.Commodity,
    mandiUnit: 'quintal',
    modalPricePerQuintal,
    minPricePerQuintal,
    maxPricePerQuintal,
    suggestedPricePerKg: modalPricePerQuintal !== null ? Number((modalPricePerQuintal / 100).toFixed(2)) : null,
    market: first.Market,
    state: first.State,
    arrivalDate: latestDate,
    recordCount: latestRecords.length,
    lastSyncedAt: new Date(),
  };
}

export async function fetchLatestMandiReference(rawCommodity, apiKey = process.env.GOVT_CROP_API_KEY) {
  const commodity = normalizeCommodityName(rawCommodity);
  if (!commodity || !apiKey) {
    return { found: false, commodity };
  }

  let records = await fetchMandiRecords(apiKey, commodity, 'Andhra Pradesh');
  if (records.length === 0) records = await fetchMandiRecords(apiKey, commodity, 'Telangana');
  if (records.length === 0) records = await fetchMandiRecords(apiKey, commodity, null);
  if (records.length === 0) {
    return { found: false, commodity };
  }

  return summariseRecords(records);
}

export function isMandiReferenceFresh(mandiReference, maxAgeHours = 24) {
  if (!mandiReference?.lastSyncedAt) return false;
  const syncedAt = new Date(mandiReference.lastSyncedAt).getTime();
  if (Number.isNaN(syncedAt)) return false;
  return Date.now() - syncedAt < maxAgeHours * 60 * 60 * 1000;
}

export async function attachMandiReferenceToCrops(crops, CropModel, options = {}) {
  const apiKey = options.apiKey || process.env.GOVT_CROP_API_KEY;
  const maxAgeHours = options.maxAgeHours || 24;

  if (!Array.isArray(crops) || crops.length === 0 || !apiKey) {
    return crops;
  }

  const groupedByCommodity = new Map();
  for (const crop of crops) {
    const commodity = normalizeCommodityName(crop.cropName);
    if (!commodity) continue;

    if (!groupedByCommodity.has(commodity)) {
      groupedByCommodity.set(commodity, []);
    }
    groupedByCommodity.get(commodity).push(crop);
  }

  const references = await Promise.all(
    Array.from(groupedByCommodity.entries()).map(async ([commodity, commodityCrops]) => {
      const reusable = commodityCrops.find((crop) => isMandiReferenceFresh(crop.mandiReference, maxAgeHours) && crop.mandiReference?.suggestedPricePerKg !== null);
      if (reusable?.mandiReference) {
        return [commodity, reusable.mandiReference];
      }

      try {
        const mandiReference = await fetchLatestMandiReference(commodity, apiKey);
        return [commodity, mandiReference.found ? mandiReference : null];
      } catch (error) {
        return [commodity, null];
      }
    })
  );

  const referenceMap = new Map(references);
  const bulkOps = [];

  for (const crop of crops) {
    const commodity = normalizeCommodityName(crop.cropName);
    const existingReference = crop.mandiReference;
    const mandiReference = referenceMap.get(commodity) || null;
    crop.mandiReference = mandiReference;

    if (CropModel && crop._id && mandiReference && !isMandiReferenceFresh(existingReference, maxAgeHours)) {
      bulkOps.push({
        updateOne: {
          filter: { _id: crop._id },
          update: { $set: { mandiReference } },
        },
      });
    }
  }

  if (CropModel && bulkOps.length > 0) {
    await CropModel.bulkWrite(bulkOps, { ordered: false });
  }

  return crops;
}