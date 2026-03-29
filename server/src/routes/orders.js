import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Crop from '../models/Crop.js';
import User from '../models/User.js';
import DealerRequest from '../models/DealerRequest.js';
import { requireAuth } from '../middlewares/auth.js';
import { sendOrderConfirmationEmails } from '../services/emailService.js';
import { calculatePlatformFee, calculateTransportPricing } from '../services/transportChargesService.js';

const router = express.Router();

const normalizeSessionRole = (value) => {
  const raw = String(value || '').toLowerCase().trim();
  if (raw === 'transport dealer') return 'dealer';
  return raw;
};

const toObjectIdOrNull = (value) => {
  if (!value) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const is24Hex = /^[a-fA-F0-9]{24}$/.test(trimmed);
  return is24Hex ? new mongoose.Types.ObjectId(trimmed) : null;
};

const normalizeVehicleType = (value) => {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('bike')) return 'Bike';
  if (raw.includes('auto')) return 'Auto';
  if (raw.includes('truck') || raw.includes('lorry') || raw.includes('mini')) return 'Truck';
  return 'Truck';
};

const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const clampBatchDiscountRate = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.max(0, Math.min(parsed, 0.15));
};

const parseMandalDistrict = (value) => {
  const text = String(value || '').trim();
  if (!text) return { mandal: '', district: '' };

  const parts = text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return { mandal: '', district: '' };
  }

  return {
    mandal: parts[0],
    district: parts.slice(1).join(', '),
  };
};

// GET all orders for logged-in user (customer/farmer/dealer) or all orders for admin
router.get('/', requireAuth, async (req, res) => {
  try {
    const role = normalizeSessionRole(req.user.role);
    const userId = req.user.sub;
    let query = null;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Admins can see all orders
    if (role === 'admin') {
      query = {};
    } else if (role === 'customer') {
      query = { customerId: userId };
    } else if (role === 'farmer') {
      query = { farmerId: userId };
    } else if (role === 'dealer') {
      query = { dealerId: userId };
    } else {
      return res.status(403).json({ message: 'Access denied for this role' });
    }
    
    const orders = await Order.find(query)
      .populate('customerId', 'name email profile')
      .populate('farmerId', 'name email profile')
      .populate('dealerId', 'name email profile')
      .sort({ createdAt: -1 });
    return res.json(orders);
  } catch (e) {
    console.error('Error fetching orders:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST - Create new order (customer places order)
router.post('/', requireAuth, async (req, res) => {
  let stockAdjustments = [];
  let orderCreated = false;
  try {
    const { orderId: requestedOrderId, items = [], delivery = {}, transport = {}, paymentMethod = 'UPI', farmerId } = req.body;
    const customerSnapshotPayload = req.body.customerSnapshot || {};
    const safeDealerRequestId = toObjectIdOrNull(req.body.dealerRequestId);
    const requestedPickup = req.body.pickup || delivery.pickup || delivery.pickupLocation || '';
    const requestedDrop = delivery.drop || delivery.location || req.body.drop || req.body.dropLocation || req.body.deliveryLocation || '';
    const parsedPickup = parseMandalDistrict(requestedPickup);
    const parsedDrop = parseMandalDistrict(requestedDrop);
    const safeFarmerId = toObjectIdOrNull(farmerId);
    const safeDealerId = toObjectIdOrNull(transport?.dealerId);
    
    // Get customer details
    const customer = await User.findById(req.user.sub);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Get farmer details if farmerId provided
    let farmer = null;
    if (safeFarmerId) {
      farmer = await User.findById(safeFarmerId);
    }

    let dealer = null;
    if (safeDealerId) {
      dealer = await User.findById(safeDealerId);
    }

    const normalizedItems = items.map((it) => ({
      ...it,
      cropId: toObjectIdOrNull(it?.cropId),
      quantity: Number(it?.quantity || 0),
      pricePerKg: Number(it?.pricePerKg || 0),
    }));

    if (!normalizedItems.length) {
      return res.status(400).json({ message: 'Order must include at least one item' });
    }

    for (const it of normalizedItems) {
      if (!it.cropId) {
        return res.status(400).json({
          message: `Missing crop reference for item ${it.cropName || ''}. Please refresh and add to cart again.`,
        });
      }
      if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
        return res.status(400).json({
          message: `Invalid quantity for item ${it.cropName || ''}. Quantity must be greater than 0.`,
        });
      }
    }

    for (const it of normalizedItems) {
      const updatedCrop = await Crop.findOneAndUpdate(
        {
          _id: it.cropId,
          isActive: true,
          status: 'listed',
          availableQuantity: { $gte: it.quantity },
        },
        {
          $inc: { availableQuantity: -it.quantity },
        },
        { new: true }
      );

      if (!updatedCrop) {
        throw new Error(`INSUFFICIENT_STOCK:${it.cropName || 'Crop'}`);
      }

      stockAdjustments.push({ cropId: it.cropId, quantity: it.quantity });

      if ((updatedCrop.availableQuantity || 0) <= 0) {
        updatedCrop.availableQuantity = 0;
        updatedCrop.status = 'sold';
        await updatedCrop.save();
      }
    }

    const itemsTotal = normalizedItems.reduce((sum, it) => sum + (it.quantity || 0) * (it.pricePerKg || 0), 0);
    const totalQuantity = normalizedItems.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
    const transportFee = Number(transport.price || 0);
    const requestPricing = safeDealerRequestId
      ? await DealerRequest.findById(safeDealerRequestId).select('pricing').lean()
      : null;
    const transportPricing = transport?.pricing || requestPricing?.pricing || {};

    const resolvedDistanceKm =
      toNumberOrNull(delivery.distance)
      ?? toNumberOrNull(transportPricing?.distanceKm)
      ?? toNumberOrNull(transportPricing?.breakdown?.distance)
      ?? 0;

    const resolvedVehicleForPricing = String(
      transportPricing?.breakdown?.vehicleType
      || transport.vehicle
      || normalizedItems?.[0]?.vehicle
      || 'TRUCK'
    ).toUpperCase();

    const resolvedBatchDiscountRate = clampBatchDiscountRate(transportPricing?.batchDiscountRate);
    const computedPricing = calculateTransportPricing(
      resolvedDistanceKm,
      resolvedVehicleForPricing,
      totalQuantity,
      { batchDiscountRate: resolvedBatchDiscountRate }
    );

    const transportFinalFee = Number.isFinite(transportFee)
      ? transportFee
      : Number(computedPricing?.finalCharge || 0);

    const resolvedTransportBaseFee = Number(computedPricing?.baseCharge || Math.max(transportFinalFee, 0));
    const resolvedBatchDiscount = Math.max(resolvedTransportBaseFee - transportFinalFee, 0);
    const shortDistanceNoSubsidy = Number.isFinite(resolvedDistanceKm) && resolvedDistanceKm <= 2;
    const resolvedDealerPayout = shortDistanceNoSubsidy
      ? transportFinalFee
      : Math.max(transportFinalFee, 0.85 * resolvedTransportBaseFee, 60);
    const resolvedPlatformContribution = shortDistanceNoSubsidy
      ? 0
      : Math.max(0, resolvedDealerPayout - transportFinalFee);

    const incentivePreview = transportPricing?.incentivePreview || {};
    const incentives = {
      eligible: Boolean(incentivePreview.eligible),
      dealerBonus: Number(incentivePreview.dealerBonus || 0),
      farmerBonus: Number(incentivePreview.farmerBonus || 0),
      totalBonus: Number(incentivePreview.totalBonus || 0),
    };

    const platformFee = calculatePlatformFee(itemsTotal);
    const total = itemsTotal + transportFinalFee + platformFee;
    
    // Generate unique order ID
    const orderId = requestedOrderId || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const order = await Order.create({
      orderId,
      customerId: req.user.sub,
      customerName: customer.name,
      customerEmail: customer.email,
      farmerId: safeFarmerId,
      farmerName: farmer ? farmer.name : (items[0]?.farmerName || 'Unknown'),
      dealerId: safeDealerId,
      dealerName: transport.dealerName || dealer?.name || null,
      dealerEmail: dealer?.email || null,
      dealerRequestId: safeDealerRequestId,
      customerSnapshot: {
        phone: String(customerSnapshotPayload.phone || delivery.dropPhone || customer?.profile?.phone || ''),
        doorNo: String(customerSnapshotPayload.doorNo || delivery.dropDoorNo || customer?.profile?.doorNo || ''),
        country: String(customerSnapshotPayload.country || delivery.dropCountry || customer?.profile?.country || ''),
        state: String(customerSnapshotPayload.state || delivery.dropState || customer?.profile?.state || ''),
        district: String(customerSnapshotPayload.district || delivery.dropDistrict || customer?.profile?.district || ''),
        mandal: String(customerSnapshotPayload.mandal || delivery.dropMandal || customer?.profile?.mandal || ''),
        pincode: String(customerSnapshotPayload.pincode || delivery.dropPincode || customer?.profile?.pincode || ''),
        locationText: String(customerSnapshotPayload.locationText || delivery.dropLocationText || requestedDrop || customer?.profile?.locationText || ''),
        coordinates: {
          lat: toNumberOrNull(customerSnapshotPayload.coordinates?.lat) ?? toNumberOrNull(delivery.dropCoordinates?.lat) ?? customer?.profile?.coordinates?.lat,
          lng: toNumberOrNull(customerSnapshotPayload.coordinates?.lng) ?? toNumberOrNull(delivery.dropCoordinates?.lng) ?? customer?.profile?.coordinates?.lng,
        },
        fullAddress: String(customerSnapshotPayload.fullAddress || delivery.fullAddress || ''), // Save full address
      },
      items: normalizedItems,
      delivery: { 
        pickup: requestedPickup || items[0]?.farmerLocation || farmer?.profile?.locationText || '',
        pickupDistrict: delivery.pickupDistrict || parsedPickup.district || farmer?.profile?.district || '',
        pickupMandal: delivery.pickupMandal || parsedPickup.mandal || farmer?.profile?.mandal || '',
        pickupCoordinates: {
          lat: toNumberOrNull(delivery.pickupCoordinates?.lat) ?? farmer?.profile?.coordinates?.lat,
          lng: toNumberOrNull(delivery.pickupCoordinates?.lng) ?? farmer?.profile?.coordinates?.lng,
        },
        drop: requestedDrop || customer?.profile?.locationText || '',
        dropDistrict: delivery.dropDistrict || parsedDrop.district || customer?.profile?.district || '',
        dropMandal: delivery.dropMandal || parsedDrop.mandal || customer?.profile?.mandal || '',
        dropCountry: delivery.dropCountry || customerSnapshotPayload.country || customer?.profile?.country || '',
        dropState: delivery.dropState || customerSnapshotPayload.state || customer?.profile?.state || '',
        dropPincode: String(delivery.dropPincode || customerSnapshotPayload.pincode || customer?.profile?.pincode || ''),
        dropDoorNo: String(delivery.dropDoorNo || customerSnapshotPayload.doorNo || customer?.profile?.doorNo || ''),
        dropLocationText: String(delivery.dropLocationText || customerSnapshotPayload.locationText || requestedDrop || ''),
        dropPhone: String(delivery.dropPhone || customerSnapshotPayload.phone || customer?.profile?.phone || ''),
        dropCoordinates: {
          lat: toNumberOrNull(delivery.dropCoordinates?.lat) ?? toNumberOrNull(customerSnapshotPayload.coordinates?.lat) ?? customer?.profile?.coordinates?.lat,
          lng: toNumberOrNull(delivery.dropCoordinates?.lng) ?? toNumberOrNull(customerSnapshotPayload.coordinates?.lng) ?? customer?.profile?.coordinates?.lng,
        },
        distance: toNumberOrNull(delivery.distance),
      },
      transport: { 
        dealerId: safeDealerId,
        dealerName: transport.dealerName || dealer?.name || null,
        vehicle: normalizeVehicleType(transport.vehicle), 
        vehicleName: transport.vehicleName,
        licensePlate: transport.licensePlate,
        price: transportFinalFee,
        ratePerKm: Number(transport.ratePerKm || 0),
      },
      agreedPrice: Number.isFinite(transportFinalFee) ? transportFinalFee : null,
      summary: {
        itemsTotal,
        distanceKm: resolvedDistanceKm,
        transportBaseFee: resolvedTransportBaseFee,
        transportFee: transportFinalFee,
        transportFinalFee,
        batchDiscount: resolvedBatchDiscount,
        dealerPayout: resolvedDealerPayout,
        platformContribution: resolvedPlatformContribution,
        platformFee,
        total,
        incentives,
      },
      paymentMethod,
      status: 'Confirmed',
    });
    orderCreated = true;

    const emailResults = await sendOrderConfirmationEmails({
      orderId: order.orderId,
      customer: {
        id: order.customerId,
        name: customer.name,
        email: customer.email,
      },
      farmer: {
        id: order.farmerId,
        name: order.farmerName,
        email: farmer?.email,
      },
      dealer: {
        id: order.dealerId,
        name: order.dealerName,
        email: dealer?.email,
      },
      pricing: {
        itemsTotal,
        transportFee,
        platformFee,
        total,
      },
    });

    order.notifications = {
      orderConfirmation: {
        customer: Boolean(emailResults.customer),
        farmer: Boolean(emailResults.farmer),
        dealer: Boolean(emailResults.dealer),
        sentAt: new Date(),
      },
    };
    await order.save();
    
    console.log('✅ Order created:', orderId);
    return res.status(201).json(order);
  } catch (e) {
    if (!orderCreated && stockAdjustments.length > 0) {
      try {
        for (const adjustment of stockAdjustments) {
          await Crop.updateOne(
            { _id: adjustment.cropId },
            {
              $inc: { availableQuantity: adjustment.quantity },
              $set: { status: 'listed', isActive: true },
            }
          );
        }
      } catch (rollbackError) {
        console.error('Error rolling back crop stock:', rollbackError);
      }
    }

    if (String(e.message || '').startsWith('INSUFFICIENT_STOCK:')) {
      const cropName = String(e.message).split(':')[1] || 'Crop';
      return res.status(409).json({
        message: `${cropName} is out of stock or has insufficient quantity. Please refresh cart and try again.`,
      });
    }

    console.error('Error creating order:', e);
    return res.status(500).json({ message: `Order creation failed: ${e.message}`, error: e.message });
  }
});

// GET orders for a specific farmer (by farmerId)
router.get('/farmer/:farmerId', requireAuth, async (req, res) => {
  try {
    const { farmerId } = req.params;
    const orders = await Order.find({ farmerId }).sort({ createdAt: -1 });
    return res.json(orders);
  } catch (e) {
    console.error('Error fetching farmer orders:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PATCH - Update order status
router.patch('/:orderId/status', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const order = await Order.findOneAndUpdate(
      { orderId },
      { status, ...(status === 'Delivered' ? { completedAt: new Date() } : {}) },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    return res.json(order);
  } catch (e) {
    console.error('Error updating order status:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE - Delete order
router.delete('/:orderId', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.sub;
    
    // Find order and verify ownership
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Only allow customer who placed order to delete it
    if (String(order.customerId) !== String(userId)) {
      return res.status(403).json({ message: 'Unauthorized to delete this order' });
    }
    
    await Order.deleteOne({ orderId });
    console.log(`🗑️ Order deleted: ${orderId}`);
    return res.json({ message: 'Order deleted successfully' });
  } catch (e) {
    console.error('Error deleting order:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
