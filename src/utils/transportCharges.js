/**
 * Client-side Transportation Charges Calculator
 * Mirrors backend slab policy for consistent UI values.
 */

const MINIMUM_BASE_CHARGE = 60;
const MINIMUM_FINAL_CHARGE = 15;
const MINIMUM_DEALER_PAYOUT = 60;
const DEALER_PAYOUT_FLOOR_RATE = 0.85;

const DISTANCE_SLABS = [
  { upto: 5, rate: 6 }, // Bike/Small vehicle: ₹6/km (was 8)
  { upto: 25, rate: 5 }, // Auto/Medium vehicle: ₹5/km (was 6.5)
  { upto: Infinity, rate: 4 }, // Truck/Large vehicle: ₹4/km (was 5.5)
];

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function clampBatchDiscountRate(rate) {
  const normalized = Number(rate);
  if (!Number.isFinite(normalized) || normalized <= 0) return 0;
  return Math.max(0, Math.min(normalized, 0.15));
}

export function calculateSlabDistanceTotal(distance) {
  const dist = Number(distance) || 0;
  if (dist <= 0) return { slabDistanceTotal: 0, slabBreakdown: [] };

  let remaining = dist;
  let covered = 0;
  let total = 0;
  const slabBreakdown = [];

  for (const slab of DISTANCE_SLABS) {
    if (remaining <= 0) break;
    const slabLength = slab.upto === Infinity ? remaining : Math.min(Math.max(slab.upto - covered, 0), remaining);
    if (slabLength <= 0) continue;
    const amount = roundCurrency(slabLength * slab.rate);
    slabBreakdown.push({ distance: roundCurrency(slabLength), rate: slab.rate, amount });
    total += amount;
    remaining -= slabLength;
    covered = slab.upto;
  }

  return { slabDistanceTotal: roundCurrency(total), slabBreakdown };
}

export function calculateTransportPricing(distance, vehicleType, quantity, options = {}) {
  const dist = Number(distance) || 0;
  if (dist < 0) {
    return {
      baseCharge: 0,
      batchDiscount: 0,
      batchDiscountRate: 0,
      batchDiscountRatePct: 0,
      finalCharge: 0,
      dealerPayout: 0,
      platformContribution: 0,
      breakdown: null,
    };
  }

  const { slabDistanceTotal, slabBreakdown } = calculateSlabDistanceTotal(dist);
  const batchDiscountRate = clampBatchDiscountRate(options?.batchDiscountRate);

  const baseCharge = roundCurrency(Math.max(MINIMUM_BASE_CHARGE, slabDistanceTotal));
  const customerFinalRaw = baseCharge * (1 - batchDiscountRate);
  const finalCharge = roundCurrency(Math.max(MINIMUM_FINAL_CHARGE, customerFinalRaw));
  const batchDiscount = roundCurrency(Math.max(0, baseCharge - finalCharge));

  const dealerPayout = roundCurrency(Math.max(finalCharge, DEALER_PAYOUT_FLOOR_RATE * baseCharge, MINIMUM_DEALER_PAYOUT));
  const platformContribution = roundCurrency(Math.max(0, dealerPayout - finalCharge));

  return {
    baseCharge,
    batchDiscount,
    batchDiscountRate,
    batchDiscountRatePct: Math.round(batchDiscountRate * 100),
    finalCharge,
    dealerPayout,
    platformContribution,
    breakdown: {
      distance: roundCurrency(dist),
      vehicleType: String(vehicleType || '').toUpperCase(),
      quantity: Number(quantity) || 0,
      slabDistanceTotal,
      slabBreakdown,
      minimumBaseCharge: MINIMUM_BASE_CHARGE,
      baseCharge,
      minimumFinalCharge: MINIMUM_FINAL_CHARGE,
      batchDiscount,
      batchDiscountRatePct: Math.round(batchDiscountRate * 100),
      finalCharge,
      dealerPayout,
      minimumDealerPayout: MINIMUM_DEALER_PAYOUT,
      dealerPayoutFloorRatePct: Math.round(DEALER_PAYOUT_FLOOR_RATE * 100),
      platformContribution,
    },
  };
}

export function calculatePlatformFee(itemsTotal) {
  const total = Number(itemsTotal) || 0;
  return Math.min(Math.round(total * 0.02), 100);
}

export function getChargeBreakdown(distance, vehicleType, quantity) {
  const result = calculateTransportPricing(distance, vehicleType, quantity);
  if (!result.breakdown) return null;
  return {
    slabBreakdown: result.breakdown.slabBreakdown,
    slabDistanceTotal: result.breakdown.slabDistanceTotal,
    minimumBaseCharge: result.breakdown.minimumBaseCharge,
    baseCharge: result.baseCharge,
    finalCharge: result.finalCharge,
  };
}

export function getPriceAlert(dealerCharge, productPrice, quantity) {
  const charge = Number(dealerCharge) || 0;
  const price = Number(productPrice) || 0;
  if (charge > price && Number(quantity) > 0) {
    return {
      type: 'warning',
      message: 'Heads up! Delivery charge is currently higher than crop value for this route.',
      showAlert: true,
    };
  }
  return { type: null, message: null, showAlert: false };
}
