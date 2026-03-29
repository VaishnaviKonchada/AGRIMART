/**
 * Distance Calculation Service
 * Uses Haversine formula to calculate distance between coordinates
 */

import Mandal from '../models/Mandal.js';

const geocodeCache = new Map();

// Approximate coordinates for Indian cities and mandals
const CITY_COORDINATES = {
  'rajahmundry': { lat: 17.3689, lng: 81.7847 },
  'kakinada': { lat: 16.9891, lng: 82.2475 },
  'visakhapatnam': { lat: 17.6869, lng: 83.2185 },
  'vijayawada': { lat: 16.5062, lng: 80.6480 },
  'guntur': { lat: 16.3067, lng: 80.4365 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'warangal': { lat: 17.9689, lng: 79.5941 },
  'khammam': { lat: 17.2677, lng: 80.6505 },
  'tirupati': { lat: 13.1886, lng: 79.8291 },
  'chittoor': { lat: 13.1939, lng: 79.1022 },
  'nellore': { lat: 14.4426, lng: 79.9864 },
  'kurnool': { lat: 15.8281, lng: 78.8349 },
  'anantapur': { lat: 14.5833, lng: 77.6000 },
  'kadapa': { lat: 14.4694, lng: 78.8216 },
  'eluru': { lat: 16.7050, lng: 81.1087 },
  'amalapuram': { lat: 16.5769, lng: 81.6901 },
  'tadepalligudem': { lat: 16.8167, lng: 81.5333 },
  'mandapeta': { lat: 16.4295, lng: 82.2075 },
  'peddapuram': { lat: 16.7642, lng: 81.9778 },
  'samalkot': { lat: 16.8333, lng: 81.9667 },
  'nidadavole': { lat: 16.6833, lng: 81.1333 },
  'tanuku': { lat: 16.7639, lng: 81.1436 },
  'tenali': { lat: 16.2486, lng: 80.6060 },
  'mangalagiri': { lat: 16.4881, lng: 80.6263 },
  'srikakulam': { lat: 18.2909, lng: 84.3184 },
  'tuni': { lat: 17.6006, lng: 82.3078 },
  'yanam': { lat: 14.7421, lng: 79.8345 },
  'anakapalle': { lat: 17.7184, lng: 83.0268 },
  'vizianagaram': { lat: 17.8750, lng: 83.4242 },
  'suryapet': { lat: 17.6289, lng: 79.1233 },
  'bhimavaram': { lat: 16.5500, lng: 81.5167 },
  'machilipatnam': { lat: 16.1852, lng: 80.7781 },
  'kavali': { lat: 14.6667, lng: 80.0000 },
  'chirala': { lat: 14.2033, lng: 79.9380 },
  'gudivada': { lat: 16.4167, lng: 80.8833 },
  'narasaraopet': { lat: 16.3833, lng: 80.0333 },
  'sullurpeta': { lat: 13.9739, lng: 79.9125 },
  'ongole': { lat: 14.6349, lng: 79.9789 },
  
  // Srikakulam district mandals
  'palasa': { lat: 18.1633, lng: 84.2667 },
  'palakonda': { lat: 18.4167, lng: 84.0833 },
  'seethampeta': { lat: 18.2833, lng: 84.0667 }, // ~14.7 km from Palakonda
  'tekkali': { lat: 18.0833, lng: 84.2500 },
  'parvathipuram': { lat: 18.0667, lng: 83.9167 },
  'etcherla': { lat: 18.0500, lng: 84.1667 },
  
  // Andhra Pradesh general fallbacks for "Manyam" areas
  'parvathipuram manyam': { lat: 18.0667, lng: 83.9167 },
  'manyam': { lat: 18.0667, lng: 83.9167 },
  'indira nagar': { lat: 18.4167, lng: 84.0833 },
};

/**
 * Get road distance from OSRM (Open Source Routing Machine)
 * Returns distance in km, or null if API fails
 */
async function getOSRMDistance(coord1, coord2) {
  if (!coord1 || !coord2 || !Number.isFinite(coord1.lat) || !Number.isFinite(coord1.lng) || !Number.isFinite(coord2.lat) || !Number.isFinite(coord2.lng)) {
    return null;
  }

  try {
    // OSRM expects: longitude,latitude
    const coords = `${coord1.lng},${coord1.lat};${coord2.lng},${coord2.lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AgriMart/1.0 (support@agrimart.local)' },
    });

    if (!response.ok) {
      console.warn(`⚠️ OSRM API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      console.warn(`⚠️ OSRM: No route found`);
      return null;
    }

    // Convert meters to km
    const distanceKm = data.routes[0].distance / 1000;
    return Math.round(distanceKm * 10) / 10; // Round to 1 decimal
  } catch (error) {
    console.warn(`⚠️ OSRM API error: ${error.message}`);
    return null;
  }
}

/**
 * Haversine formula to calculate distance between two coordinates
 * Returns distance in kilometers (fallback when OSRM unavailable)
 */
export function calculateDistance(coord1, coord2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRad(deg) {
  return deg * (Math.PI / 180);
}

function isValidCoordinatePair(coords) {
  return Boolean(
    coords
    && Number.isFinite(coords.lat)
    && Number.isFinite(coords.lng)
  );
}

async function resolveDistanceFromCoordinates(coord1, coord2, sourceLabel) {
  if (!isValidCoordinatePair(coord1) || !isValidCoordinatePair(coord2)) {
    return -1;
  }

  if (sourceLabel) {
    console.log(`\n🧭 Distance calculation (${sourceLabel})`);
    console.log(`  📍 Pickup coords: ${JSON.stringify(coord1)}, Drop coords: ${JSON.stringify(coord2)}`);
  }

  const haversineDistance = calculateDistance(coord1, coord2);
  if (sourceLabel) {
    console.log(`  📏 Haversine (straight-line): ${haversineDistance.toFixed(1)} km`);
  }

  let osrmDistance = await getOSRMDistance(coord1, coord2);
  if (sourceLabel) {
    console.log(`  🛣️  OSRM (road distance): ${osrmDistance ? osrmDistance.toFixed(1) + ' km' : 'null'}`);
  }

  if (osrmDistance && osrmDistance > 0) {
    const ratio = osrmDistance / haversineDistance;
    if (sourceLabel) {
      console.log(`  🔀 Ratio (OSRM/Haversine): ${ratio.toFixed(2)}x`);
    }

    if (ratio >= 1 && ratio <= 5.0) {
      if (sourceLabel) {
        console.log(`  ✅ Using OSRM distance: ${osrmDistance} km`);
      }
      return osrmDistance;
    }

    if (ratio > 5.0) {
      const roundedHaversine = Math.round(haversineDistance * 10) / 10;
      if (sourceLabel) {
        console.log(`  ⚠️  Ratio too high (>${5.0}x), falling back to Haversine: ${roundedHaversine} km`);
      }
      return roundedHaversine;
    }
  }

  const roundedDistance = Math.round(haversineDistance * 10) / 10;
  if (sourceLabel) {
    console.log(`  ⬇️  Falling back to Haversine: ${roundedDistance} km`);
  }
  return roundedDistance;
}

/**
 * Get coordinates for a city (case-insensitive)
 * Handles various location formats
 */
export function getCityCoordinates(cityName) {
  if (!cityName) return null;
  
  const lookup = cityName.toLowerCase().trim();
  if (CITY_COORDINATES[lookup]) {
    return CITY_COORDINATES[lookup];
  }
  
  return null;
}

export async function getDistanceBetweenCoordinates(pickupCoordinates, dropCoordinates) {
  return resolveDistanceFromCoordinates(pickupCoordinates, dropCoordinates, 'exact coordinates');
}

function getStaticFallbackCoordinates(locationText) {
  const exact = getCityCoordinates(locationText);
  if (exact) return exact;

  const { mandalCandidate } = parseLocationParts(locationText);
  if (mandalCandidate) {
    return getCityCoordinates(mandalCandidate);
  }

  return null;
}

async function geocodeWithNominatim(query) {
  if (!query) return null;

  const cacheKey = query.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'AgriMart/1.0 (support@agrimart.local)' },
  });

  if (!response.ok) {
    geocodeCache.set(cacheKey, null);
    return null;
  }

  const results = await response.json();
  const top = Array.isArray(results) ? results[0] : null;
  const lat = top ? Number(top.lat) : NaN;
  const lng = top ? Number(top.lon) : NaN;
  const coordinates = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

  geocodeCache.set(cacheKey, coordinates);
  return coordinates;
}

async function getGeocodedCoordinates(locationText) {
  if (!locationText) return null;

  const { mandalCandidate, districtCandidate } = parseLocationParts(locationText);
  const queryCandidates = [];

  const mandalHint = await getMandalLocationHint(locationText);
  if (mandalHint) {
    if (mandalHint.name && mandalHint.district && mandalHint.region) {
      queryCandidates.push(`${mandalHint.name}, ${mandalHint.district}, ${mandalHint.region}, Andhra Pradesh, India`);
    }
    if (mandalHint.name && mandalHint.district) {
      queryCandidates.push(`${mandalHint.name}, ${mandalHint.district}, Andhra Pradesh, India`);
    }
    if (mandalHint.name && mandalHint.region) {
      queryCandidates.push(`${mandalHint.name}, ${mandalHint.region}, Andhra Pradesh, India`);
    }
  }

  if (mandalCandidate && districtCandidate) {
    queryCandidates.push(`${mandalCandidate}, ${districtCandidate}, Andhra Pradesh, India`);
  }

  if (mandalCandidate) {
    queryCandidates.push(`${mandalCandidate}, Andhra Pradesh, India`);
  }

  queryCandidates.push(`${locationText}, Andhra Pradesh, India`);

  const queries = [...new Set(queryCandidates.filter(Boolean))];

  for (const query of queries) {
    const coord = await geocodeWithNominatim(query);
    if (coord) return coord;
  }

  return null;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createExactCaseInsensitiveRegex(value) {
  return { $regex: `^${escapeRegex(value)}$`, $options: 'i' };
}

function parseLocationParts(location) {
  const parts = String(location || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    mandalCandidate: parts[0] || '',
    districtCandidate: parts[1] || '',
    parts,
  };
}

async function getMandalLocationHint(locationText) {
  if (!locationText) return null;

  const { mandalCandidate, districtCandidate } = parseLocationParts(locationText);
  if (!mandalCandidate) return null;

  const mandalRegex = createExactCaseInsensitiveRegex(mandalCandidate);

  if (districtCandidate) {
    const districtRegex = createExactCaseInsensitiveRegex(districtCandidate);
    const strict = await Mandal.findOne({
      name: mandalRegex,
      $or: [
        { district: districtRegex },
        { region: districtRegex },
      ],
    }).select('name district region').lean();

    if (strict) {
      return strict;
    }
  }

  const fallback = await Mandal.findOne({
    name: mandalRegex,
  }).select('name district region').lean();

  return fallback || null;
}

async function getMandalCoordinatesFromDb(locationText) {
  if (!locationText) return null;

  const { mandalCandidate, districtCandidate, parts } = parseLocationParts(locationText);

  const hasCoordinates = (record) => (
    record?.coordinates &&
    Number.isFinite(record.coordinates.lat) &&
    Number.isFinite(record.coordinates.lng)
  );

  // Try strict match: mandal + district
  if (mandalCandidate && districtCandidate) {
    const districtRegex = createExactCaseInsensitiveRegex(districtCandidate);
    const strictMatch = await Mandal.findOne({
      name: createExactCaseInsensitiveRegex(mandalCandidate),
      $or: [
        { district: districtRegex },
        { region: districtRegex },
      ],
    }).select('coordinates').lean();

    if (hasCoordinates(strictMatch)) {
      return strictMatch.coordinates;
    }

    // If mandal not found, try the district as a mandal (handles "Area, Mandal" format)
    const districtAsMandal = await Mandal.findOne({
      name: districtRegex,
    }).select('coordinates').lean();

    if (hasCoordinates(districtAsMandal)) {
      console.log(`  💡 Using district "${districtCandidate}" as mandal (fallback from "${mandalCandidate}")`);
      return districtAsMandal.coordinates;
    }
  }

  // Try mandal only
  if (mandalCandidate) {
    const mandalOnlyMatch = await Mandal.findOne({
      name: createExactCaseInsensitiveRegex(mandalCandidate),
    }).select('coordinates').lean();

    if (hasCoordinates(mandalOnlyMatch)) {
      return mandalOnlyMatch.coordinates;
    }
  }

  // Try other parts (including district as fallback)
  for (const part of parts) {
    if (!part) continue;
    const match = await Mandal.findOne({
      name: createExactCaseInsensitiveRegex(part),
    }).select('coordinates').lean();

    if (hasCoordinates(match)) {
      return match.coordinates;
    }
  }

  return null;
}

/**
 * Calculate distance between two cities/locations
 * Handles both city names and "Area/Mandal, District" format
 * Returns distance in km, or -1 if city not found
 */
export async function getDistanceBetweenCities(pickupCity, dropCity) {
  if (!pickupCity || !dropCity) {
    console.warn(`❌ Invalid location: pickupCity or dropCity is empty`);
    return -1;
  }

  console.log(`\n🧭 Distance calculation: "${pickupCity}" → "${dropCity}"`);

  // Step 1: Get coordinates from database (priority: actual geocoded data)
  let coord1 = await getMandalCoordinatesFromDb(pickupCity);
  let coord2 = await getMandalCoordinatesFromDb(dropCity);

  console.log(`  📍 DB Coords - Pickup: ${JSON.stringify(coord1)}, Drop: ${JSON.stringify(coord2)}`);

  // Step 2: If not found in DB, geocode from Nominatim
  if (!coord1) {
    coord1 = await getGeocodedCoordinates(pickupCity);
  }

  if (!coord2) {
    coord2 = await getGeocodedCoordinates(dropCity);
  }
  
  if (!coord1 || !coord2) {
    console.warn(`❌ Location not found: ${!coord1 ? pickupCity : dropCity}`);
    return -1;
  }

  return resolveDistanceFromCoordinates(coord1, coord2);
}

/**
 * Determine vehicle type based on distance
 * 0-5km: BIKE
 * 5-50km: AUTO
 * 50km+: TRUCK
 */
export function getVehicleTypeByDistance(distance) {
  if (distance <= 5) return 'BIKE';
  if (distance <= 50) return 'AUTO';
  return 'TRUCK';
}

/**
 * Determine vehicle type based on quantity in kg
 * <=10kg: BIKE
 * >10kg to <=50kg: AUTO
 * >50kg to <=150kg: TRUCK
 */
export function getVehicleTypeByQuantity(quantity) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  if (qty <= 10) return 'BIKE';
  if (qty > 10 && qty <= 50) return 'AUTO';
  if (qty > 50 && qty <= 150) return 'TRUCK';
  return null;
}

/**
 * Check if location is in location list (fuzzy match)
 * Handles both exact matches and "Mandal, District" format matching
 */
function normalizeLocationTokens(value) {
  if (!value) return [];

  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return cleaned
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

export function isLocationMatch(targetLocation, locationList) {
  const target = (targetLocation || "").toLowerCase().trim();
  if (!target) return false;

  // Extract both mandal and district from "Mandal, District" format
  const targetParts = target.split(',').map(p => p.trim());
  const targetMandal = targetParts[0];
  const targetDistrict = targetParts[1] || '';

  return (locationList || []).some((loc) => {
    const normalized = (loc || "").toLowerCase().trim();
    if (!normalized) return false;

    // Extract mandal and district from dealer location
    const locParts = normalized.split(',').map(p => p.trim());
    const locMandal = locParts[0];
    const locDistrict = locParts[1] || '';

    // Check for exact matches first
    if (normalized.includes(target) || target.includes(normalized)) {
      return true;
    }

    // Check for mandal match
    if (targetMandal && locMandal && targetMandal === locMandal) {
      return true;
    }

    // Check for district match (fallback when mandal names don't match)
    if (targetDistrict && locDistrict && targetDistrict === locDistrict) {
      return true;
    }

    // Fallback to token-based fuzzy matching
    const targetTokens = normalizeLocationTokens(target);
    const locationTokens = new Set(normalizeLocationTokens(normalized));
    return targetTokens.some((token) => locationTokens.has(token));
  });
}

/**
 * Filter dealers by vehicle type, pickup location, and drop location
 */
export function filterDealers(dealers, vehicleType, pickupLocation, dropLocation) {
  return dealers.filter(dealer => {
    const matchingVehicles = dealer.vehicles.filter(v => 
      v.vehicleType === vehicleType &&
      v.isActive &&
      v.isVisibleToCustomers &&
      isLocationMatch(pickupLocation, v.pickupLocations || []) &&
      isLocationMatch(dropLocation, v.dropLocations || [])
    );

    return matchingVehicles.length > 0;
  });
}

/**
 * Calculate quoted price for a dealer's service
 */
export function calculateQuotedPrice(vehicleType, distance, quantity, basePrice, perKmPrice, pricePerKg) {
  let price = basePrice || 0;
  
  // Add per-km cost
  price += distance * (perKmPrice || 10);
  
  // Add per-kg cost
  price += quantity * (pricePerKg || 0);
  
  return Math.round(price);
}

export default {
  calculateDistance,
  getCityCoordinates,
  getDistanceBetweenCities,
  getVehicleTypeByDistance,
  getVehicleTypeByQuantity,
  isLocationMatch,
  filterDealers,
  calculateQuotedPrice,
};
