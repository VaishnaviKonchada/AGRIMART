/**
 * Transportation Charges Calculation Service (Unified Policy)
 * Implements slab distance pricing + optional batch discount + dealer payout protection.
 */

const MINIMUM_BASE_CHARGE = 50;
const MINIMUM_FINAL_CHARGE = 15;
const MINIMUM_DEALER_PAYOUT = 60;
const DEALER_PAYOUT_FLOOR_RATE = 0.85;
const SHORT_DISTANCE_NO_SUBSIDY_KM = 2;

const DISTANCE_SLABS = [
  { upto: 5, rate: 8 },
  { upto: 25, rate: 6.5 },
  { upto: Infinity, rate: 5.5 },
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
  if (dist <= 0) return 0;

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

  return {
    slabDistanceTotal: roundCurrency(total),
    slabBreakdown,
  };
}

export function calculateBaseDeliveryCharge(distance) {
  const { slabDistanceTotal, slabBreakdown } = calculateSlabDistanceTotal(distance);
  const baseCharge = Math.max(MINIMUM_BASE_CHARGE, slabDistanceTotal);
  return {
    baseCharge: roundCurrency(baseCharge),
    slabDistanceTotal: roundCurrency(slabDistanceTotal),
    slabBreakdown,
    minimumBaseChargeApplied: slabDistanceTotal < MINIMUM_BASE_CHARGE,
  };
}

export function calculateDealerPayout(baseCharge, customerFinalCharge, distanceKm = null) {
  const base = Number(baseCharge) || 0;
  const customerFinal = Number(customerFinalCharge) || 0;

  // For very short local deliveries, platform should not subsidize payout.
  if (Number.isFinite(distanceKm) && Number(distanceKm) <= SHORT_DISTANCE_NO_SUBSIDY_KM) {
    return roundCurrency(customerFinal);
  }

  const payoutFloor = DEALER_PAYOUT_FLOOR_RATE * base;
  return roundCurrency(Math.max(customerFinal, payoutFloor, MINIMUM_DEALER_PAYOUT));
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

  const batchDiscountRate = clampBatchDiscountRate(options?.batchDiscountRate);
  const baseResult = calculateBaseDeliveryCharge(dist);
  const baseCharge = Number(baseResult.baseCharge || 0);

  const discountedCustomerCharge = baseCharge * (1 - batchDiscountRate);
  const finalCharge = roundCurrency(Math.max(MINIMUM_FINAL_CHARGE, discountedCustomerCharge));
  const batchDiscount = roundCurrency(Math.max(0, baseCharge - finalCharge));

  const dealerPayout = calculateDealerPayout(baseCharge, finalCharge, dist);
  const shortDistanceNoSubsidyApplied = Number.isFinite(dist) && dist <= SHORT_DISTANCE_NO_SUBSIDY_KM;
  const platformContribution = shortDistanceNoSubsidyApplied
    ? 0
    : roundCurrency(Math.max(0, dealerPayout - finalCharge));

  return {
    distanceKm: roundCurrency(dist),
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
      slabDistanceTotal: baseResult.slabDistanceTotal,
      slabBreakdown: baseResult.slabBreakdown,
      minimumBaseCharge: MINIMUM_BASE_CHARGE,
      minimumBaseChargeApplied: baseResult.minimumBaseChargeApplied,
      baseCharge,
      batchDiscount,
      batchDiscountRatePct: Math.round(batchDiscountRate * 100),
      minimumFinalCharge: MINIMUM_FINAL_CHARGE,
      finalCharge,
      dealerPayout,
      shortDistanceNoSubsidyKm: SHORT_DISTANCE_NO_SUBSIDY_KM,
      shortDistanceNoSubsidyApplied,
      dealerPayoutFloorRatePct: Math.round(DEALER_PAYOUT_FLOOR_RATE * 100),
      minimumDealerPayout: MINIMUM_DEALER_PAYOUT,
      platformContribution,
    },
  };
}

export function calculatePlatformFee(itemsTotal) {
  const total = Number(itemsTotal) || 0;
  return Math.min(Math.round(total * 0.02), 100);
}

export function getChargeBreakdown(distance, vehicleType, quantity) {
  const pricing = calculateTransportPricing(distance, vehicleType, quantity);
  if (!pricing.breakdown) return null;
  return {
    slabBreakdown: pricing.breakdown.slabBreakdown,
    slabDistanceTotal: pricing.breakdown.slabDistanceTotal,
    minimumBaseCharge: pricing.breakdown.minimumBaseCharge,
    baseCharge: pricing.baseCharge,
    finalCharge: pricing.finalCharge,
  };
}

export function getPriceAlertMessage(dealerCharge, productPrice, quantity) {
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

export function getRates() {
  return {
    distanceSlabs: DISTANCE_SLABS,
    minimumBaseCharge: MINIMUM_BASE_CHARGE,
    minimumFinalCharge: MINIMUM_FINAL_CHARGE,
    shortDistanceNoSubsidyKm: SHORT_DISTANCE_NO_SUBSIDY_KM,
    minimumDealerPayout: MINIMUM_DEALER_PAYOUT,
    dealerPayoutFloorRate: DEALER_PAYOUT_FLOOR_RATE,
  };
}
