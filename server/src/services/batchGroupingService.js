/**
 * Batch Grouping Service
 * Groups nearby confirmed orders into batch trips for dealers.
 * Rules:
 *   - Drop locations within BATCH_RADIUS_KM of each other
 *   - Same pickup area (same farmer OR same pickupMandal/pickupDistrict)
 *   - Total weight <= vehicle capacity
 *   - Orders must be in 'Confirmed' status with requestStatus 'accepted'
 */

const BATCH_RADIUS_KM = 5;

// Vehicle capacity in kg
const VEHICLE_CAPACITY = {
  Bike:  80,
  Auto:  300,
  Truck: 800,
};

// Batch discount percentages
const STANDARD_BATCH_DISCOUNT_PCT = 0.10;
const HIGH_EFFICIENCY_BATCH_DISCOUNT_PCT = 0.15;

// Minimum delivery floor (never go below this)
const MINIMUM_DELIVERY_CHARGE = 15;
const MINIMUM_DEALER_PAYOUT = 60;
const DEALER_PAYOUT_FLOOR_RATE = 0.85;
const SHORT_DISTANCE_NO_SUBSIDY_KM = 2;

/**
 * Haversine distance between two lat/lng points (returns km)
 */
function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const chord =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord));
}

function validCoords(coords) {
  const lat = Number(coords?.lat);
  const lng = Number(coords?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

/**
 * Returns whether two orders are within BATCH_RADIUS_KM of each other
 * using drop coordinates when available, otherwise returns false (can't batch without coords).
 */
function dropsAreNearby(orderA, orderB) {
  const coordsA = orderA.delivery?.dropCoordinates;
  const coordsB = orderB.delivery?.dropCoordinates;
  if (!validCoords(coordsA) || !validCoords(coordsB)) return false;
  return haversineKm(coordsA, coordsB) <= BATCH_RADIUS_KM;
}

/**
 * Returns whether two orders share the same pickup area
 * (same farmerId OR same pickupMandal+District combination)
 */
function samePickupArea(orderA, orderB) {
  const farmerA = String(orderA.farmerId?._id || orderA.farmerId || '');
  const farmerB = String(orderB.farmerId?._id || orderB.farmerId || '');
  if (farmerA && farmerB && farmerA === farmerB) return true;

  const mandalA = String(orderA.delivery?.pickupMandal || '').trim().toLowerCase();
  const mandalB = String(orderB.delivery?.pickupMandal || '').trim().toLowerCase();
  const distA = String(orderA.delivery?.pickupDistrict || '').trim().toLowerCase();
  const distB = String(orderB.delivery?.pickupDistrict || '').trim().toLowerCase();

  return mandalA && mandalB && mandalA === mandalB &&
         distA && distB && distA === distB;
}

/**
 * Total weight of all items in an order (kg)
 */
function orderWeight(order) {
  return (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

/**
 * Calculate batch discount for one order given it's now part of a batch.
 * Applies BATCH_DISCOUNT_PCT on current delivery fee, respects minimum floor.
 */
function getBaseCharge(order) {
  return Number(
    order.summary?.transportBaseFee ||
    order.summary?.transportFinalFee ||
    order.summary?.transportFee ||
    order.agreedPrice ||
    order.transport?.price ||
    0
  );
}

function getBatchDiscountRate(batchOrders) {
  if (!Array.isArray(batchOrders) || batchOrders.length < 3) {
    return STANDARD_BATCH_DISCOUNT_PCT;
  }

  const drops = batchOrders
    .map((o) => o.delivery?.dropCoordinates)
    .filter((c) => validCoords(c));

  if (drops.length < 3) {
    return STANDARD_BATCH_DISCOUNT_PCT;
  }

  let maxPairDistance = 0;
  for (let i = 0; i < drops.length; i++) {
    for (let j = i + 1; j < drops.length; j++) {
      maxPairDistance = Math.max(maxPairDistance, haversineKm(drops[i], drops[j]));
    }
  }

  return maxPairDistance <= 2.5
    ? HIGH_EFFICIENCY_BATCH_DISCOUNT_PCT
    : STANDARD_BATCH_DISCOUNT_PCT;
}

function calcBatchDiscount(order, discountRate = STANDARD_BATCH_DISCOUNT_PCT) {
  const baseCharge = getBaseCharge(order);
  const customerFinal = Math.max(baseCharge * (1 - discountRate), MINIMUM_DELIVERY_CHARGE);
  return Math.max(baseCharge - customerFinal, 0);
}

function getOrderDistanceKm(order) {
  const parsed = Number(order?.delivery?.distance);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function calcDealerPayout(baseCharge, customerFinal, distanceKm = null) {
  if (Number.isFinite(distanceKm) && Number(distanceKm) <= SHORT_DISTANCE_NO_SUBSIDY_KM) {
    return Number(customerFinal || 0);
  }
  return Math.max(customerFinal, DEALER_PAYOUT_FLOOR_RATE * baseCharge, MINIMUM_DEALER_PAYOUT);
}

/**
 * Main grouping function.
 * @param {Array} orders - Array of Order documents (populated or lean)
 * @returns {{ batches: Array, singles: Array }}
 *   batches: Array of { batchId, orders: [...], vehicleType, totalWeight, totalEarnings, pickupLocation, stops }
 *   singles: Array of individual order objects (unchanged from current flow)
 */
function groupOrdersIntoBatches(orders) {
  if (!orders || orders.length === 0) {
    return { batches: [], singles: [] };
  }

  const used = new Set();
  const batches = [];
  const singles = [];

  for (let i = 0; i < orders.length; i++) {
    if (used.has(i)) continue;

    const groupIndexes = [i];

    for (let j = i + 1; j < orders.length; j++) {
      if (used.has(j)) continue;

      // Check same pickup + nearby drops
      if (!samePickupArea(orders[i], orders[j])) continue;
      if (!dropsAreNearby(orders[i], orders[j])) continue;

      // Weight check: all current group members + candidate
      const currentWeight = groupIndexes.reduce((sum, idx) => sum + orderWeight(orders[idx]), 0);
      const candidateWeight = orderWeight(orders[j]);
      const totalWeight = currentWeight + candidateWeight;

      // Vehicle type should match across the batch
      const vehicleA = String(orders[i].transport?.vehicle || '');
      const vehicleB = String(orders[j].transport?.vehicle || '');
      if (vehicleA !== vehicleB) continue;

      const capacity = VEHICLE_CAPACITY[vehicleA] || 80;
      if (totalWeight > capacity) continue;

      groupIndexes.push(j);
    }

    if (groupIndexes.length >= 2) {
      // It's a batch
      groupIndexes.forEach((idx) => used.add(idx));

      const batchOrders = groupIndexes.map((idx) => orders[idx]);
      const vehicleType = batchOrders[0].transport?.vehicle || 'Bike';
      const totalWeight = batchOrders.reduce((sum, o) => sum + orderWeight(o), 0);
      const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const batchDiscountRate = getBatchDiscountRate(batchOrders);

      // Compute batch discount + payout per order
      const ordersWithDiscount = batchOrders.map((o) => {
        const baseCharge = getBaseCharge(o);
        const batchDiscount = calcBatchDiscount(o, batchDiscountRate);
        const customerFinal = Math.max(baseCharge - batchDiscount, MINIMUM_DELIVERY_CHARGE);
        const distanceKm = getOrderDistanceKm(o);
        const dealerPayout = calcDealerPayout(baseCharge, customerFinal, distanceKm);
        const platformContribution = Number.isFinite(distanceKm) && distanceKm <= SHORT_DISTANCE_NO_SUBSIDY_KM
          ? 0
          : Math.max(0, dealerPayout - customerFinal);
        return {
          ...o.toObject ? o.toObject() : o,
          transportBaseFee: baseCharge,
          batchDiscount,
          transportFinalFee: customerFinal,
          dealerPayout,
          platformContribution,
        };
      });

      const totalEarnings = ordersWithDiscount.reduce((sum, o) => {
        return sum + Number(o.dealerPayout || 0);
      }, 0);

      const pickupLocation =
        batchOrders[0].delivery?.pickup ||
        batchOrders[0].delivery?.pickupMandal ||
        'Pickup';

      const stops = ordersWithDiscount.map((o, idx) => ({
        stopNumber: idx + 1,
        orderId: o.orderId,
        _id: String(o._id),
        customerId: String(o.customerId?._id || o.customerId || ''),
        farmerId: String(o.farmerId?._id || o.farmerId || ''),
        customerName: o.customerName,
        customer: {
          id: String(o.customerId?._id || o.customerId || ''),
          name: o.customerId?.name || o.customerName,
          phone: o.delivery?.dropPhone || o.customerSnapshot?.phone || o.customerPhone || '',
          address: o.delivery?.dropDoorNo || o.customerSnapshot?.doorNo || '',
          mandal: o.delivery?.dropMandal || o.customerSnapshot?.mandal || '',
          district: o.delivery?.dropDistrict || o.customerSnapshot?.district || '',
          state: o.delivery?.dropState || o.customerSnapshot?.state || '',
          pincode: o.delivery?.dropPincode || o.customerSnapshot?.pincode || '',
          locationText: o.delivery?.dropLocationText || o.customerSnapshot?.locationText || ''
        },
        farmer: {
          id: String(o.farmerId?._id || o.farmerId || ''),
          name: o.farmerId?.name || o.farmerName,
          phone: o.farmerPhone || o.farmerId?.profile?.phone || '',
          email: o.farmerEmail || o.farmerId?.email || '',
          location: o.delivery?.pickup || o.farmerId?.profile?.locationText || ''
        },
        dropLocation:
          o.delivery?.drop ||
          o.delivery?.dropMandal ||
          o.delivery?.dropDistrict ||
          'Drop',
        dropCoordinates: o.delivery?.dropCoordinates || null,
        quantity: orderWeight(o),
        cropItem: o.items?.[0]?.cropName || 'N/A',
        deliveryFee: Number(o.transportBaseFee || 0),
        batchDiscount: o.batchDiscount,
        finalFee: Number(o.transportFinalFee || 0),
        dealerPayout: Number(o.dealerPayout || 0),
        platformContribution: Number(o.platformContribution || 0),
        distanceKm: Number.isFinite(Number(o.delivery?.distance)) ? Number(o.delivery.distance) : null,
      }));

      batches.push({
        batchId,
        vehicleType,
        totalWeight,
        totalEarnings: Math.round(totalEarnings),
        batchDiscountRatePct: Math.round(batchDiscountRate * 100),
        pickupLocation,
        orderCount: ordersWithDiscount.length,
        stops,
        orders: ordersWithDiscount,
      });
    } else {
      used.add(i);
      singles.push(orders[i]);
    }
  }

  return { batches, singles };
}

export { groupOrdersIntoBatches, calcBatchDiscount, haversineKm, BATCH_RADIUS_KM, VEHICLE_CAPACITY, MINIMUM_DELIVERY_CHARGE };
