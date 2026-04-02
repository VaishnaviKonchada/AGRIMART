import express from 'express';
import Order from '../models/Order.js';
import DealerRequest from '../models/DealerRequest.js';
import { calculateDistance, getCityCoordinates, getDistanceBetweenCities } from '../services/distanceService.js';
import { requireAuth } from '../middlewares/auth.js';
import { groupOrdersIntoBatches, calcBatchDiscount } from '../services/batchGroupingService.js';

const router = express.Router();

const ACTIVE_ORDER_STATUSES = ['Confirmed', 'Accepted', 'In Transit', 'Delivered'];

const normalizeSessionRole = (value) => {
  const raw = String(value || '').toLowerCase().trim();
  if (raw === 'transport dealer') return 'dealer';
  return raw;
};

const getOrderAmount = (order) => {
  if (Number.isFinite(order?.summary?.dealerPayout)) return order.summary.dealerPayout;
  if (Number.isFinite(order?.agreedPrice)) return order.agreedPrice;
  if (Number.isFinite(order?.transport?.price)) return order.transport.price;
  return 0;
};

const getDealerBonus = (order) => {
  const bonus = Number(order?.summary?.incentives?.dealerBonus || 0);
  return Number.isFinite(bonus) && bonus > 0 ? bonus : 0;
};

const getDealerTotalPayout = (order) => getOrderAmount(order) + getDealerBonus(order);

const getOrderDistance = (order) => {
  const parsed = Number(order?.delivery?.distance);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeCoordinates = (coords) => {
  const lat = Number(coords?.lat);
  const lng = Number(coords?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const toRoundedDistance = (value) => {
  return Number.isFinite(value) && value > 0 ? Math.round(value * 10) / 10 : null;
};

const normalizeText = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

const formatLocationText = (primaryText, mandal, district, fallback = 'N/A') => {
  const locationParts = [mandal, district]
    .map((part) => String(part || '').trim())
    .filter(Boolean);

  if (hasText(primaryText) && locationParts.length) {
    const primaryNormalized = normalizeText(primaryText);
    const locationNormalized = normalizeText(locationParts.join(', '));
    const overlaps = locationParts.some((part) => primaryNormalized.includes(normalizeText(part)));

    // If both sources represent the same area, keep concise mandal,district display.
    if (overlaps || primaryNormalized === locationNormalized) {
      return locationParts.join(', ');
    }

    // If sources conflict, trust customer-selected explicit text (e.g., custom drop location).
    return String(primaryText).trim();
  }

  if (locationParts.length) {
    return locationParts.join(', ');
  }

  if (hasText(primaryText)) {
    return String(primaryText).trim();
  }

  return fallback;
};

const getOrderRouteText = (order, pickupLocation, dropLocation) => {
  const pickupText = normalizeText(order?.delivery?.pickup || pickupLocation || '');
  const dropText = normalizeText(order?.delivery?.drop || dropLocation || '');
  return { pickupText, dropText };
};

const getMatchedRequestDistance = async (order, pickupLocation, dropLocation) => {
  const dealerId = String(order?.dealerId?._id || order?.dealerId || '');
  const customerId = String(order?.customerId?._id || order?.customerId || '');
  if (!dealerId || !customerId) return null;

  const requests = await DealerRequest.find({ dealerId, customerId })
    .select('pickupLocation dropLocation distance quantity vehicleType requestSentAt createdAt')
    .sort({ requestSentAt: -1, createdAt: -1 })
    .limit(25)
    .lean();

  if (!requests.length) return null;

  const { pickupText, dropText } = getOrderRouteText(order, pickupLocation, dropLocation);
  const orderQuantity = Number(order?.items?.[0]?.quantity || 0);
  const orderVehicle = normalizeText(order?.transport?.vehicle || '');
  const orderTime = new Date(order?.createdAt || Date.now()).getTime();

  let best = null;
  let bestScore = -1;

  for (const req of requests) {
    const reqDistance = toRoundedDistance(Number(req?.distance));
    if (reqDistance === null) continue;

    const reqPickup = normalizeText(req?.pickupLocation);
    const reqDrop = normalizeText(req?.dropLocation);
    const reqVehicle = normalizeText(req?.vehicleType);
    const reqQuantity = Number(req?.quantity || 0);
    const reqTime = new Date(req?.requestSentAt || req?.createdAt || Date.now()).getTime();

    let score = 0;
    if (pickupText && reqPickup && (pickupText.includes(reqPickup) || reqPickup.includes(pickupText))) score += 3;
    if (dropText && reqDrop && (dropText.includes(reqDrop) || reqDrop.includes(dropText))) score += 3;
    if (orderVehicle && reqVehicle && orderVehicle.includes(reqVehicle.toLowerCase())) score += 1;
    if (orderQuantity > 0 && reqQuantity > 0 && Math.abs(orderQuantity - reqQuantity) <= 0.01) score += 1;

    const timePenaltyHours = Math.abs(orderTime - reqTime) / (1000 * 60 * 60);
    const adjustedScore = score - Math.min(timePenaltyHours / 24, 2);

    if (adjustedScore > bestScore) {
      bestScore = adjustedScore;
      best = reqDistance;
    }
  }

  return bestScore >= 2 ? best : null;
};

const computeDistanceFallback = (order) => {
  const pickupCoords = normalizeCoordinates(order?.delivery?.pickupCoordinates);
  const dropCoords = normalizeCoordinates(order?.delivery?.dropCoordinates);

  if (pickupCoords && dropCoords) {
    return toRoundedDistance(calculateDistance(pickupCoords, dropCoords));
  }

  const pickupText = order?.delivery?.pickupMandal || order?.delivery?.pickupDistrict || order?.delivery?.pickup;
  const dropText = order?.delivery?.dropMandal || order?.delivery?.dropDistrict || order?.delivery?.drop;
  const pickupCity = getCityCoordinates(pickupText);
  const dropCity = getCityCoordinates(dropText);

  if (pickupCity && dropCity) {
    return toRoundedDistance(calculateDistance(pickupCity, dropCity));
  }

  return null;
};

const computeDistanceFallbackAsync = async (order, pickupLocation, dropLocation) => {
  const requestDistance = await getMatchedRequestDistance(order, pickupLocation, dropLocation);
  if (requestDistance !== null) return requestDistance;

  const syncDistance = computeDistanceFallback(order);
  if (syncDistance !== null) return syncDistance;

  const pickupCandidate = order?.delivery?.pickup || order?.delivery?.pickupMandal || order?.delivery?.pickupDistrict || pickupLocation;
  const dropCandidate = order?.delivery?.drop || order?.delivery?.dropMandal || order?.delivery?.dropDistrict || dropLocation;

  if (!pickupCandidate || !dropCandidate) {
    return null;
  }

  try {
    const geocodedDistance = await getDistanceBetweenCities(String(pickupCandidate), String(dropCandidate));
    return toRoundedDistance(geocodedDistance);
  } catch (error) {
    return null;
  }
};

const getOrderDate = (order) => new Date(order?.completedAt || order?.acceptedAt || order?.createdAt || Date.now());

/**
 * GET /api/dealer/requests/:dealerId
 * Get all pending requests for a specific dealer (not yet accepted)
 */
router.get('/requests/:dealerId', async (req, res) => {
  try {
    const { dealerId } = req.params;
    
    const requests = await Order.find({
      dealerId,
      requestStatus: 'pending',
      requestExpiresAt: { $gt: new Date() } // Not expired
    })
    .sort({ createdAt: -1 })
    .populate('customerId', 'name email phone')
    .populate('farmerId', 'name email phone');

    res.json({
      success: true,
      count: requests.length,
      requests: requests.map(req => ({
        _id: req._id,
        orderId: req.orderId,
        customerName: req.customerName,
        farmerName: req.farmerName,
        cropItem: req.items?.[0]?.cropName || 'N/A',
        quantity: req.items?.[0]?.quantity || 0,
        pickupLocation: formatLocationText(req.delivery?.pickup, req.delivery?.pickupMandal, req.delivery?.pickupDistrict),
        dropLocation: formatLocationText(req.delivery?.drop, req.delivery?.dropMandal, req.delivery?.dropDistrict),
        distance: req.delivery.distance,
        vehicleType: req.transport.vehicle,
        amount: req.transport.price,
        specialNotes: req.specialNotes,
        timeRemaining: Math.floor((req.requestExpiresAt - new Date()) / 1000), // seconds
        createdAt: req.createdAt
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching dealer requests:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/dealer/requests/:orderId/accept
 * Accept a pending request
 */
router.post('/requests/:orderId/accept', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        requestStatus: 'accepted',
        status: 'Accepted',
        acceptedAt: new Date()
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      success: true,
      message: 'Request accepted successfully',
      order
    });
  } catch (error) {
    console.error('❌ Error accepting request:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/dealer/requests/:orderId/reject
 * Reject a pending request
 */
router.post('/requests/:orderId/reject', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        requestStatus: 'rejected',
        status: 'Rejected',
        rejectedAt: new Date()
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      success: true,
      message: 'Request rejected',
      order
    });
  } catch (error) {
    console.error('❌ Error rejecting request:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/dealer/orders/:dealerId
 * Get all confirmed orders for a dealer
 */
router.get('/orders/:dealerId', requireAuth, async (req, res) => {
  try {
    const { dealerId } = req.params;
    const sessionRole = normalizeSessionRole(req.user?.role);
    const sessionUserId = String(req.user?.sub || '');

    if (!sessionUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (sessionRole !== 'admin' && sessionRole !== 'dealer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (sessionRole === 'dealer' && String(dealerId) !== sessionUserId) {
      return res.status(403).json({ error: 'You can only access your own orders' });
    }

    const orders = await Order.find({
      dealerId,
      status: { $in: ACTIVE_ORDER_STATUSES }
    })
    .populate('customerId', 'name email profile')
    .populate('farmerId', 'name email profile')
    .sort({ acceptedAt: -1 });

    const mappedOrders = await Promise.all(orders.map(async (order) => {
      const pickupLocation = formatLocationText(order.delivery?.pickup, order.delivery?.pickupMandal, order.delivery?.pickupDistrict);
      const dropLocation = formatLocationText(order.delivery?.drop, order.delivery?.dropMandal, order.delivery?.dropDistrict);
      const resolvedDistance = getOrderDistance(order) ?? await computeDistanceFallbackAsync(order, pickupLocation, dropLocation);

      return {
        _id: order._id,
        orderId: order.orderId,
        customerId: String(order.customerId?._id || order.customerId || ''),
        dealerId: String(order.dealerId?._id || order.dealerId || ''),
        farmerId: String(order.farmerId?._id || order.farmerId || ''),
        // Customer Details
        customer: {
          name: order.customerId?.name || order.customerName,
          email: order.customerId?.email || order.customerEmail,
          phone: order.delivery?.dropPhone || order.customerSnapshot?.phone || order.customerId?.profile?.phone,
          address: order.delivery?.dropDoorNo || order.customerSnapshot?.doorNo || order.customerId?.profile?.doorNo,
          district: order.delivery?.dropDistrict || order.customerSnapshot?.district || order.customerId?.profile?.district,
          state: order.delivery?.dropState || order.customerSnapshot?.state || order.customerId?.profile?.state,
          mandal: order.delivery?.dropMandal || order.customerSnapshot?.mandal || order.customerId?.profile?.mandal,
          pincode: order.delivery?.dropPincode || order.customerSnapshot?.pincode || order.customerId?.profile?.pincode,
          locationText: order.delivery?.dropLocationText || order.customerSnapshot?.locationText || order.delivery?.drop || ''
        },
        // Farmer Details
        farmer: {
          name: order.farmerId?.name || order.farmerName,
          email: order.farmerId?.email,
          phone: order.farmerId?.profile?.phone,
          address: order.farmerId?.profile?.doorNo,
          district: order.farmerId?.profile?.district,
          state: order.farmerId?.profile?.state,
          mandal: order.farmerId?.profile?.mandal,
          pincode: order.farmerId?.profile?.pincode
        },
        cropItem: order.items?.[0]?.cropName || 'N/A',
        quantity: order.items?.[0]?.quantity || 0,
        pickupLocation,
        dropLocation,
        pickupCoordinates: order.delivery?.pickupCoordinates || null,
        dropCoordinates: order.delivery?.dropCoordinates || null,
        distance: resolvedDistance,
        distanceSource: (
          Number.isFinite(Number(order.delivery?.pickupCoordinates?.lat))
          && Number.isFinite(Number(order.delivery?.pickupCoordinates?.lng))
          && Number.isFinite(Number(order.delivery?.dropCoordinates?.lat))
          && Number.isFinite(Number(order.delivery?.dropCoordinates?.lng))
        ) ? 'Exact GPS' : 'Fallback area',
        vehicleType: order.transport.vehicle,
        amount: getOrderAmount(order),
        transportBaseFee: Number(order.summary?.transportBaseFee || order.transport?.price || 0),
        batchDiscount: Number(order.summary?.batchDiscount || 0),
        dealerPayout: Number(order.summary?.dealerPayout || getOrderAmount(order) || 0),
        platformContribution: Number(order.summary?.platformContribution || 0),
        transportFinalFee: Number(order.summary?.transportFee || getOrderAmount(order) || 0),
        dealerBonus: getDealerBonus(order),
        totalPayout: getDealerTotalPayout(order),
        agreedPrice: order.agreedPrice,
        originalPrice: order.transport.price,
        status: order.status,
        specialNotes: order.specialNotes,
        createdAt: order.createdAt,
        acceptedAt: order.acceptedAt
      };
    }));

    res.json({
      success: true,
      count: orders.length,
      orders: mappedOrders
    });
  } catch (error) {
    console.error('❌ Error fetching dealer orders:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/dealer/earnings/:dealerId
 * Get earnings summary for a dealer
 */
router.get('/earnings/:dealerId', async (req, res) => {
  try {
    const { dealerId } = req.params;

    // Include all active orders so pending confirmed deals are visible in earnings.
    const completedOrders = await Order.find({
      dealerId,
      status: { $in: ACTIVE_ORDER_STATUSES }
    });

    // Calculate totals
    const totalEarnings = completedOrders.reduce((sum, order) => sum + getOrderAmount(order), 0);
    const totalBonus = completedOrders.reduce((sum, order) => sum + getDealerBonus(order), 0);
    const completedCount = completedOrders.length;
    const thisMonth = completedOrders.filter(o => {
      const orderDate = getOrderDate(o);
      const now = new Date();
      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    });
    const thisWeek = completedOrders.filter(o => {
      const orderDate = getOrderDate(o);
      const now = new Date();
      const diff = now - orderDate;
      return diff < 7 * 24 * 60 * 60 * 1000;
    });

    res.json({
      success: true,
      earnings: {
        totalReceived: totalEarnings,
        totalBonus,
        totalPayout: totalEarnings + totalBonus,
        thisMonth: thisMonth.reduce((sum, o) => sum + getOrderAmount(o), 0),
        thisWeek: thisWeek.reduce((sum, o) => sum + getOrderAmount(o), 0),
        bonusThisMonth: thisMonth.reduce((sum, o) => sum + getDealerBonus(o), 0),
        bonusThisWeek: thisWeek.reduce((sum, o) => sum + getDealerBonus(o), 0),
        completedDeliveries: completedCount,
        recentOrder: completedOrders[0]
          ? {
              orderId: completedOrders[0].orderId,
              amount: getOrderAmount(completedOrders[0]),
              dealerBonus: getDealerBonus(completedOrders[0]),
              totalPayout: getDealerTotalPayout(completedOrders[0]),
              status: completedOrders[0].status,
              createdAt: completedOrders[0].completedAt || completedOrders[0].acceptedAt || completedOrders[0].createdAt,
            }
          : null
      }
    });
  } catch (error) {
    console.error('❌ Error fetching earnings:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/dealer/payments/:dealerId
 * Get payment history for a dealer
 */
router.get('/payments/:dealerId', async (req, res) => {
  try {
    const { dealerId } = req.params;

    const payments = await Order.find({
      dealerId,
      status: { $in: ACTIVE_ORDER_STATUSES }
    })
    .select('orderId customerName createdAt completedAt acceptedAt transport.price agreedPrice status')
    .sort({ acceptedAt: -1, createdAt: -1 });

    res.json({
      success: true,
      count: payments.length,
      payments: payments.map(payment => ({
        transactionId: payment.orderId,
        amount: getOrderAmount(payment),
        dealerBonus: getDealerBonus(payment),
        totalPayout: getDealerTotalPayout(payment),
        customerName: payment.customerName,
        date: payment.completedAt || payment.acceptedAt || payment.createdAt,
        status: payment.status || 'Confirmed'
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching payments:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/dealer/orders/:orderId/complete
 * Mark an order as completed
 */
router.post('/orders/:orderId/complete', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        status: 'Delivered',
        completedAt: new Date()
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      success: true,
      message: 'Order completed successfully',
      order
    });
  } catch (error) {
    console.error('❌ Error completing order:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/dealer/batch-orders/:dealerId
 * Returns dealer's confirmed orders grouped into batches + singles.
 * Batch = 2+ orders with nearby drop locations (<=3km), same pickup, same vehicle, weight fits capacity.
 * Singles = orders that don't qualify for any batch (current single-order behavior unchanged).
 */
router.get('/batch-orders/:dealerId', requireAuth, async (req, res) => {
  try {
    const { dealerId } = req.params;
    const sessionRole = normalizeSessionRole(req.user?.role);
    const sessionUserId = String(req.user?.sub || '');

    if (!sessionUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (sessionRole !== 'admin' && sessionRole !== 'dealer') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (sessionRole === 'dealer' && String(dealerId) !== sessionUserId) {
      return res.status(403).json({ error: 'You can only access your own orders' });
    }

    const orders = await Order.find({
      dealerId,
      status: { $in: ACTIVE_ORDER_STATUSES }
    })
    .populate('customerId', 'name email profile')
    .populate('farmerId', 'name email profile')
    .sort({ acceptedAt: -1 });

    const { batches, singles } = groupOrdersIntoBatches(orders);

    // Map singles using the same shape as /orders/:dealerId
    const mappedSingles = await Promise.all(singles.map(async (order) => {
      const pickupLocation = formatLocationText(order.delivery?.pickup, order.delivery?.pickupMandal, order.delivery?.pickupDistrict);
      const dropLocation = formatLocationText(order.delivery?.drop, order.delivery?.dropMandal, order.delivery?.dropDistrict);
      const resolvedDistance = getOrderDistance(order) ?? await computeDistanceFallbackAsync(order, pickupLocation, dropLocation);

      return {
        type: 'single',
        _id: String(order._id),
        orderId: order.orderId,
        customerId: String(order.customerId?._id || order.customerId || ''),
        farmerId: String(order.farmerId?._id || order.farmerId || ''),
        customerName: order.customerName,
        farmerName: order.farmerName,
        cropItem: order.items?.[0]?.cropName || 'N/A',
        quantity: order.items?.[0]?.quantity || 0,
        pickupLocation,
        dropLocation,
        pickupCoordinates: order.delivery?.pickupCoordinates || null,
        dropCoordinates: order.delivery?.dropCoordinates || null,
        distance: resolvedDistance,
        vehicleType: order.transport?.vehicle,
        amount: getOrderAmount(order),
        transportBaseFee: Number(order.summary?.transportBaseFee || order.transport?.price || 0),
        batchDiscount: Number(order.summary?.batchDiscount || 0),
        dealerPayout: Number(order.summary?.dealerPayout || getOrderAmount(order) || 0),
        platformContribution: Number(order.summary?.platformContribution || 0),
        transportFinalFee: Number(order.summary?.transportFee || getOrderAmount(order) || 0),
        status: order.status,
        customer: {
          name: order.customerId?.name || order.customerName,
          phone: order.delivery?.dropPhone || order.customerSnapshot?.phone || order.customerPhone || '',
          address: order.delivery?.dropDoorNo || order.customerSnapshot?.doorNo || '',
          mandal: order.delivery?.dropMandal || order.customerSnapshot?.mandal || '',
          district: order.delivery?.dropDistrict || order.customerSnapshot?.district || '',
          state: order.delivery?.dropState || order.customerSnapshot?.state || '',
          pincode: order.delivery?.dropPincode || order.customerSnapshot?.pincode || '',
          locationText: order.delivery?.dropLocationText || order.customerSnapshot?.locationText || ''
        },
        farmer: {
          name: order.farmerId?.name || order.farmerName,
          phone: order.farmerPhone || order.farmerId?.profile?.phone || '',
          email: order.farmerEmail || order.farmerId?.email || '',
          location: order.delivery?.pickup || order.farmerId?.profile?.locationText || ''
        },
        createdAt: order.createdAt,
        acceptedAt: order.acceptedAt,
      };
    }));

    res.json({
      success: true,
      batches,
      singles: mappedSingles,
      totalOrders: orders.length,
    });
  } catch (error) {
    console.error('❌ Error fetching batch orders:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
