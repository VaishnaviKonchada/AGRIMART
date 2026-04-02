import express from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import TransportDealer from '../models/TransportDealer.js';
import DealerRequest from '../models/DealerRequest.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import {
  getDistanceBetweenCities,
  getDistanceBetweenCoordinates,
  getVehicleTypeByDistance,
  getVehicleTypeByQuantity,
  filterDealers,
  calculateQuotedPrice,
  isLocationMatch,
} from '../services/distanceService.js';
import { calculateTransportPricing, getPriceAlertMessage } from '../services/transportChargesService.js';
import { sendDealerRequestEmail, sendRequestStatusEmail } from '../services/emailService.js';

const router = express.Router();
const CLIENT_APP_URL = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

const normalizeCoordinates = (coords) => {
  const lat = Number(coords?.lat);
  const lng = Number(coords?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const parseCoordinatesFromQuery = (query, prefix) => {
  const lat = Number(query?.[`${prefix}Lat`]);
  const lng = Number(query?.[`${prefix}Lng`]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const parseBatchDiscountRate = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.max(0, Math.min(parsed, 0.15));
};

const resolveRouteDistance = async ({ pickupLocation, dropLocation, pickupCoordinates, dropCoordinates }) => {
  const normalizedPickup = normalizeCoordinates(pickupCoordinates);
  const normalizedDrop = normalizeCoordinates(dropCoordinates);

  if (normalizedPickup && normalizedDrop) {
    return getDistanceBetweenCoordinates(normalizedPickup, normalizedDrop);
  }

  return getDistanceBetweenCities(pickupLocation, dropLocation);
};

/**
 * GET /api/transport-dealers/filter
 * Get dealers based on pickup location, drop location, and quantity
 * Query params: pickupLocation, dropLocation, quantity
 * Public endpoint
 */
router.get('/filter', async (req, res) => {
  try {
    const { pickupLocation, dropLocation, quantity, pickupOnly, productPrice, batchDiscountRate } = req.query;
    const numericProductPrice = Number(productPrice) || 0;
    const resolvedBatchDiscountRate = parseBatchDiscountRate(batchDiscountRate);
    const pickupCoordinates = parseCoordinatesFromQuery(req.query, 'pickup');
    const dropCoordinates = parseCoordinatesFromQuery(req.query, 'drop');


    if (!pickupLocation || !dropLocation) {
      return res.status(400).json({
        error: 'pickupLocation and dropLocation are required'
      });
    }

    // ✅ Check if we're filtering by pickup only (before drop location is selected)
    const isPickupOnlyFilter = pickupOnly === 'true';

    // ✅ Calculate distance
    const distance = await resolveRouteDistance({
      pickupLocation,
      dropLocation,
      pickupCoordinates,
      dropCoordinates,
    });
    if (distance === -1 && !isPickupOnlyFilter) {
      return res.status(400).json({
        error: 'Invalid pickup or drop location'
      });
    }

    // ✅ Determine vehicle type based on BOTH quantity and distance
    const typeByQty = getVehicleTypeByQuantity(quantity);
    const typeByDist = getVehicleTypeByDistance(distance);
    
    const hierarchy = { 'BIKE': 1, 'AUTO': 2, 'TRUCK': 3 };
    const vehicleType = (hierarchy[typeByQty] || 0) >= (hierarchy[typeByDist] || 0) 
      ? typeByQty 
      : typeByDist;

    if (!vehicleType) {
      return res.status(400).json({
        error: 'Invalid request parameters for vehicle selection'
      });
    }

    // ✅ Fetch all dealers with required vehicle type
    const allDealers = await TransportDealer.find({
      isActive: true,
      'vehicles.vehicleType': vehicleType,
      'vehicles.isActive': true,
    }).populate('dealerId', 'name email profile');

    // ✅ Filter dealers by location match
    const filteredDealers = isPickupOnlyFilter
      ? filterDealers(allDealers, vehicleType, pickupLocation, pickupLocation) // Only check pickup
      : filterDealers(allDealers, vehicleType, pickupLocation, dropLocation);   // Check both

    // ✅ Enrich dealers with pricing info (per matching vehicle)
    const dealersWithPrices = filteredDealers.map(dealer => {
      const hasVerifiedVehicle = (dealer.vehicles || []).some((v) =>
        v.vehicleType === vehicleType &&
        v.isActive &&
        v.isVisibleToCustomers &&
        v.documentVerified
      );

      const isDealerEligible = Boolean(dealer.isVerified || hasVerifiedVehicle);
      if (!isDealerEligible) {
        return null;
      }

      const matchingVehicles = dealer.vehicles.filter(v => {
        const pickupMatches = v.vehicleType === vehicleType &&
          v.isActive &&
          v.isVisibleToCustomers &&
          v.documentVerified &&
          isLocationMatch(pickupLocation, v.pickupLocations || []);
        
        // If pickup only, just check pickup. Otherwise check both pickup and drop
        if (isPickupOnlyFilter) {
          return pickupMatches;
        } else {
          return pickupMatches && isLocationMatch(dropLocation, v.dropLocations || []);
        }
      });

      const vehicles = matchingVehicles.map(vehicle => {
        const qty = parseInt(quantity) || 1;
        const quotedPrice = calculateQuotedPrice(
          vehicleType,
          distance,
          qty,
          vehicle.basePrice,
          vehicle.perKmPrice,
          vehicle.pricePerKg
        );

        const pricing = calculateTransportPricing(distance, vehicle.vehicleType, qty, {
          batchDiscountRate: resolvedBatchDiscountRate,
        });
        const effectiveTransportCharge = Number(pricing?.finalCharge) || Number(quotedPrice) || 0;

        const priceAlert = getPriceAlertMessage(effectiveTransportCharge, numericProductPrice, qty);

        return {
          _id: vehicle._id,
          vehicleType: vehicle.vehicleType,
          vehicleName: vehicle.vehicleName,
          licensePlate: vehicle.licensePlate,
          capacity: vehicle.capacity,
          year: vehicle.year,
          insuranceExpiry: vehicle.insuranceExpiry,
          quantity: vehicle.quantity,
          status: vehicle.status,
          documentVerified: vehicle.documentVerified,
          pickupLocations: vehicle.pickupLocations || [],
          dropLocations: vehicle.dropLocations || [],
          quotedPrice: effectiveTransportCharge,
          transportCharge: effectiveTransportCharge,
          baseTransportCharge: Number(pricing?.baseCharge || effectiveTransportCharge),
          batchDiscount: Number(pricing?.batchDiscount || 0),
          batchDiscountRate: Number(pricing?.batchDiscountRate || 0),
          batchDiscountRatePct: Number(pricing?.batchDiscountRatePct || 0),
          dealerPayout: Number(pricing?.dealerPayout || effectiveTransportCharge),
          platformContribution: Number(pricing?.platformContribution || 0),
          pricingBreakdown: pricing?.breakdown || null,
          incentivePreview: pricing?.incentivePreview || {
            eligible: false,
            dealerBonus: 0,
            farmerBonus: 0,
            totalBonus: 0,
          },
          priceAlert,
        };
      });

      return {
        _id: dealer._id,
        dealerId: dealer.dealerId._id,
        dealerName: dealer.dealerName,
        dealerPhone: dealer.dealerPhone,
        dealerPhoto: dealer.dealerPhoto,
        dealerVerified: isDealerEligible,
        rating: dealer.rating,
        reviewCount: dealer.reviewCount,
        totalTrips: dealer.totalTrips,
        distance,
        vehicles,
      };
    }).filter((dealer) => dealer && dealer.vehicles.length > 0);

    const filterType = isPickupOnlyFilter ? 'pickup from' : 'route';
    const locationDesc = isPickupOnlyFilter 
      ? pickupLocation 
      : `${pickupLocation} → ${dropLocation} (${distance}km)`;
    
    console.log(`✅ Found ${dealersWithPrices.length} ${vehicleType} dealers for ${filterType}: ${locationDesc}`);

    const routePriceAlert = dealersWithPrices
      .flatMap((dealer) => dealer.vehicles || [])
      .map((vehicle) => vehicle.priceAlert)
      .find((alert) => alert?.showAlert) || null;

    res.json({
      success: true,
      distance,
      vehicleType,
      batchDiscountRate: resolvedBatchDiscountRate,
      dealerCount: dealersWithPrices.length,
      priceAlert: routePriceAlert,
      dealers: dealersWithPrices.sort((a, b) => {
        const left = Math.min(...(a.vehicles || []).map((v) => Number(v.transportCharge || v.quotedPrice || Infinity)));
        const right = Math.min(...(b.vehicles || []).map((v) => Number(v.transportCharge || v.quotedPrice || Infinity)));
        return left - right;
      }),
    });

  } catch (error) {
    console.error('❌ Error filtering dealers:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/transport-dealers/request
 * Create a dealer request (customer initiates chat)
 * Body: { dealerId, pickupLocation, dropLocation, quantity, farmerName, farmerLocation, quotedPrice }
 * Requires: Auth, customer role
 */
router.post('/request', requireAuth, requireRole('customer'), async (req, res) => {
  try {
    const {
      dealerId,
      pickupLocation,
      dropLocation,
      quantity,
      farmerName,
      farmerLocation,
      cropItem,
      cropName,
      cropDetails,
      quotedPrice,
      vehicleType,
      vehicleId,
      vehicleName,
      licensePlate,
      pricing,
      customerPhone,
      customerDoorNo,
      customerCountry,
      customerState,
      customerDistrict,
      customerMandal,
      customerPincode,
      customerLocationText,
      customerCoordinates,
      pickupCoordinates,
      fullAddress, // Accept fullAddress from frontend
    } = req.body;

    if (!dealerId || !pickupLocation || !dropLocation || !quantity) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    if (
      !customerPhone ||
      !customerCountry ||
      !customerState ||
      !customerDistrict ||
      !customerMandal ||
      !customerPincode ||
      !customerLocationText
    ) {
      return res.status(400).json({
        error: 'Missing required customer address fields'
      });
    }

    let normalizedPhone = String(customerPhone || '').replace(/\D/g, '');
    if (normalizedPhone.length === 12 && normalizedPhone.startsWith('91')) {
      normalizedPhone = normalizedPhone.slice(2);
    }
    if (normalizedPhone.length === 11 && normalizedPhone.startsWith('0')) {
      normalizedPhone = normalizedPhone.slice(1);
    }

    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // ✅ Verify dealer exists
    const dealer = await TransportDealer.findOne({ dealerId }).populate('dealerId', 'name email');
    if (!dealer) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    // ✅ Calculate distance
    const normalizedCustomerCoordinates = normalizeCoordinates(customerCoordinates);
    const normalizedPickupCoordinates = normalizeCoordinates(pickupCoordinates);

    const distance = await resolveRouteDistance({
      pickupLocation,
      dropLocation,
      pickupCoordinates: normalizedPickupCoordinates,
      dropCoordinates: normalizedCustomerCoordinates,
    });

    // ✅ Create dealer request with 5-minute expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    const resolvedCropItem = cropItem || cropName || cropDetails || '';

    const resolvedQty = Number(quantity) || 0;
    const resolvedVehicleTypeQty = getVehicleTypeByQuantity(resolvedQty);
    const resolvedVehicleTypeDist = getVehicleTypeByDistance(distance);
    const hierarchy = { 'BIKE': 1, 'AUTO': 2, 'TRUCK': 3 };
    const resolvedVehicleType = (hierarchy[resolvedVehicleTypeQty] || 0) >= (hierarchy[resolvedVehicleTypeDist] || 0)
      ? String(resolvedVehicleTypeQty).toUpperCase()
      : String(resolvedVehicleTypeDist).toUpperCase();
    const resolvedBatchDiscountRate = parseBatchDiscountRate(pricing?.batchDiscountRate);
    const computedPricing = calculateTransportPricing(distance, resolvedVehicleType, resolvedQty, {
      batchDiscountRate: resolvedBatchDiscountRate,
    });
    const resolvedQuotedPrice = Number(computedPricing?.finalCharge || quotedPrice || 0);

    const dealerRequest = new DealerRequest({
      customerId: req.user.sub,
      dealerId: dealerId,
      dealerName: dealer.dealerName,
      pickupLocation,
      dropLocation,
      distance,
      quantity,
      vehicleType,
      vehicleId,
      vehicleName,
      licensePlate,
      quotedPrice: resolvedQuotedPrice,
      pricing: {
        distanceKm: Number(computedPricing?.distanceKm || distance || 0),
        baseCharge: Number(computedPricing?.baseCharge || resolvedQuotedPrice || 0),
        finalCharge: Number(computedPricing?.finalCharge || resolvedQuotedPrice || 0),
        batchDiscount: Number(computedPricing?.batchDiscount || 0),
        batchDiscountRate: Number(computedPricing?.batchDiscountRate || 0),
        batchDiscountRatePct: Number(computedPricing?.batchDiscountRatePct || 0),
        dealerPayout: Number(computedPricing?.dealerPayout || resolvedQuotedPrice || 0),
        platformContribution: Number(computedPricing?.platformContribution || 0),
        incentivePreview: {
          eligible: Boolean(computedPricing?.incentivePreview?.eligible),
          dealerBonus: Number(computedPricing?.incentivePreview?.dealerBonus || 0),
          farmerBonus: Number(computedPricing?.incentivePreview?.farmerBonus || 0),
          totalBonus: Number(computedPricing?.incentivePreview?.totalBonus || 0),
        },
      },
      farmerName,
      farmerLocation,
      cropItem: resolvedCropItem,
      cropDetails: cropDetails || resolvedCropItem,
      customerPhone: `+91${normalizedPhone}`,
      customerDoorNo: customerDoorNo || '',
      customerCountry: String(customerCountry || '').trim(),
      customerState: String(customerState || '').trim(),
      customerDistrict: String(customerDistrict || '').trim(),
      customerMandal: String(customerMandal || '').trim(),
      customerPincode: String(customerPincode || '').trim(),
      customerLocationText: String(customerLocationText || '').trim(),
      customerCoordinates: {
        lat: normalizedCustomerCoordinates?.lat,
        lng: normalizedCustomerCoordinates?.lng,
      },
      expiresAt,
      requestSentAt: new Date(),
      status: 'PENDING',
      notificationSent: true,
      fullAddress: fullAddress || '',
    });

    await dealerRequest.save();

    // Send dealer email alert in parallel with in-app request list flow.
    try {
      const customer = await User.findById(req.user.sub).select('name email').lean();
      await sendDealerRequestEmail({
        dealerEmail: dealer?.dealerId?.email,
        dealerName: dealer?.dealerName,
        customerName: customer?.name || 'Customer',
        pickupLocation,
        dropLocation,
        quantity,
        quotedPrice,
        vehicleType,
        requestId: dealerRequest._id,
        appBaseUrl: CLIENT_APP_URL,
      });
    } catch (emailError) {
      console.warn('⚠️ Could not send dealer request email:', emailError.message);
    }

    console.log(`📬 Dealer request sent to ${dealer.dealerName} (Expires at: ${expiresAt})`);

    res.json({
      success: true,
      requestId: dealerRequest._id,
      message: 'Request sent to dealer. Waiting for response (5 minutes timeout)...',
      expiresAt,
    });

  } catch (error) {
    console.error('❌ Error creating dealer request:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/transport-dealers/request/:requestId
 * Check status of a dealer request
 * Public endpoint
 */
router.get('/request/:requestId', async (req, res) => {
  try {
    const dealerRequest = await DealerRequest.findById(req.params.requestId);

    if (!dealerRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // ✅ Check if request expired
    if (dealerRequest.status === 'PENDING' && dealerRequest.expiresAt < new Date()) {
      await DealerRequest.updateOne(
        { _id: dealerRequest._id },
        { $set: { status: 'EXPIRED' } }
      );
      dealerRequest.status = 'EXPIRED';
    }

    let chatId = null;
    if (dealerRequest.status === 'ACCEPTED') {
      const chat = await Chat.findOne({ dealerRequestId: dealerRequest._id }).select('_id');
      chatId = chat?._id || null;
    }

    res.json({
      success: true,
      requestId: dealerRequest._id,
      status: dealerRequest.status,
      dealerName: dealerRequest.dealerName,
      quotedPrice: dealerRequest.quotedPrice,
      rejectReason: dealerRequest.rejectReason || '',
      respondedAt: dealerRequest.respondedAt,
      chatId,
      expiresAt: dealerRequest.expiresAt,
      timeRemaining: Math.max(0, dealerRequest.expiresAt - Date.now()), // in milliseconds
    });

  } catch (error) {
    console.error('❌ Error fetching request status:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/transport-dealers/pending
 * Get all pending requests for a dealer
 * Requires: Auth, dealer role
 */
router.get('/pending', requireAuth, requireRole('dealer'), async (req, res) => {
  try {
    const dealer = await TransportDealer.findOne({ dealerId: req.user.sub });
    if (!dealer) {
      return res.status(404).json({ error: 'Dealer profile not found' });
    }

    const pendingRequests = await DealerRequest.find({
      // DealerRequest.dealerId stores the dealer's User _id (not TransportDealer _id)
      dealerId: req.user.sub,
      status: 'PENDING',
      expiresAt: { $gt: new Date() },
    })
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 });

    const requests = pendingRequests.map((request) => {
      const expiresAt = request.expiresAt ? new Date(request.expiresAt) : null;
      const timeRemaining = expiresAt
        ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
        : 0;

      return {
        ...request.toObject(),
        cropItem: request.cropItem || request.cropDetails || '',
        customerName: request.customerId?.name || 'Customer',
        customerEmail: request.customerId?.email || '',
        amount: request.quotedPrice,
        timeRemaining,
      };
    });

    res.json({
      success: true,
      count: requests.length,
      requests,
    });

  } catch (error) {
    console.error('❌ Error fetching pending requests:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/transport-dealers/request/:requestId/accept
 * Dealer accepts a customer request
 * Requires: Auth, dealer role
 */
router.put('/request/:requestId/accept', requireAuth, requireRole('dealer'), async (req, res) => {
  try {
    const dealerRequest = await DealerRequest.findById(req.params.requestId)
      .populate('customerId', 'name email')
      .populate('dealerId', 'name email');

    if (!dealerRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (dealerRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request is no longer pending' });
    }

    const dealerOwnerId = dealerRequest?.dealerId?._id || dealerRequest?.dealerId;
    if (String(dealerOwnerId) !== String(req.user.sub)) {
      return res.status(403).json({ error: 'Not authorized to accept this request' });
    }

    if (dealerRequest.expiresAt < new Date()) {
      await DealerRequest.updateOne(
        { _id: dealerRequest._id },
        { $set: { status: 'EXPIRED' } }
      );
      dealerRequest.status = 'EXPIRED';
      return res.status(400).json({ error: 'Request has expired' });
    }

    // ✅ Accept the request
    const respondedAt = new Date();
    await DealerRequest.updateOne(
      { _id: dealerRequest._id },
      { $set: { status: 'ACCEPTED', respondedAt } }
    );
    dealerRequest.status = 'ACCEPTED';
    dealerRequest.respondedAt = respondedAt;

    // Create or reuse a chat thread for this accepted request
    let chat = await Chat.findOne({ dealerRequestId: dealerRequest._id });
    if (!chat) {
      chat = await Chat.create({
        customerId: dealerRequest?.customerId?._id || dealerRequest?.customerId,
        dealerId: dealerRequest?.dealerId?._id || dealerRequest?.dealerId,
        dealerRequestId: dealerRequest._id,
        messages: [],
        negotiation: {
          offeredPrice: dealerRequest.quotedPrice,
          vehicle: dealerRequest.vehicleType,
          pickup: dealerRequest.pickupLocation,
          drop: dealerRequest.dropLocation,
        },
      });
    }

    try {
      await sendRequestStatusEmail({
        customerEmail: dealerRequest?.customerId?.email,
        customerName: dealerRequest?.customerId?.name || 'Customer',
        dealerName: dealerRequest?.dealerId?.name || dealerRequest?.dealerName || 'Dealer',
        status: 'ACCEPTED',
        reason: '',
        appBaseUrl: CLIENT_APP_URL,
      });
    } catch (emailError) {
      console.warn('⚠️ Could not send customer accepted email:', emailError.message);
    }

    console.log(`✅ Dealer accepted request ID: ${dealerRequest._id}`);

    res.json({
      success: true,
      message: 'Request accepted successfully',
      requestId: dealerRequest._id,
      chatId: chat._id,
    });

  } catch (error) {
    console.error('❌ Error accepting request:', error.message);
    if (error?.name === 'ValidationError') {
      const details = Object.values(error.errors || {}).map((e) => e.message).join(', ');
      return res.status(400).json({ error: details || 'Validation failed while accepting request' });
    }
    res.status(500).json({ error: 'Server error while accepting request' });
  }
});

/**
 * PUT /api/transport-dealers/request/:requestId/reject
 * Dealer rejects a customer request
 * Requires: Auth, dealer role
 */
router.put('/request/:requestId/reject', requireAuth, requireRole('dealer'), async (req, res) => {
  try {
    const { reason } = req.body || {};
    const dealerRequest = await DealerRequest.findById(req.params.requestId)
      .populate('customerId', 'name email')
      .populate('dealerId', 'name email');

    if (!dealerRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (dealerRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request is no longer pending' });
    }

    const dealerOwnerId = dealerRequest?.dealerId?._id || dealerRequest?.dealerId;
    if (String(dealerOwnerId) !== String(req.user.sub)) {
      return res.status(403).json({ error: 'Not authorized to reject this request' });
    }

    // ✅ Reject the request
    const respondedAt = new Date();
    const rejectReason = reason || 'Dealer is currently unavailable';
    await DealerRequest.updateOne(
      { _id: dealerRequest._id },
      { $set: { status: 'REJECTED', rejectReason, respondedAt } }
    );
    dealerRequest.status = 'REJECTED';
    dealerRequest.rejectReason = rejectReason;
    dealerRequest.respondedAt = respondedAt;

    try {
      await sendRequestStatusEmail({
        customerEmail: dealerRequest?.customerId?.email,
        customerName: dealerRequest?.customerId?.name || 'Customer',
        dealerName: dealerRequest?.dealerId?.name || dealerRequest?.dealerName || 'Dealer',
        status: 'REJECTED',
        reason: dealerRequest.rejectReason,
        appBaseUrl: CLIENT_APP_URL,
      });
    } catch (emailError) {
      console.warn('⚠️ Could not send customer rejected email:', emailError.message);
    }

    console.log(`❌ Dealer rejected request ID: ${dealerRequest._id}`);

    res.json({
      success: true,
      message: 'Request rejected',
      requestId: dealerRequest._id,
    });

  } catch (error) {
    console.error('❌ Error rejecting request:', error.message);
    if (error?.name === 'ValidationError') {
      const details = Object.values(error.errors || {}).map((e) => e.message).join(', ');
      return res.status(400).json({ error: details || 'Validation failed while rejecting request' });
    }
    res.status(500).json({ error: 'Server error while rejecting request' });
  }
});

export default router;
