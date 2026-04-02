import express from 'express';
import Chat from '../models/Chat.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { requireAuth } from '../middlewares/auth.js';
import { sendChatDecisionEmail } from '../services/emailService.js';
import { calculatePlatformFee } from '../services/transportChargesService.js';

const router = express.Router();
const CLIENT_APP_URL = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

const roundCurrency = (value) => Math.round((Number(value) || 0) * 100) / 100;

// POST /api/chats - initiate chat with dealer
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'customer') return res.status(403).json({ message: 'Customer only' });
    const { dealerId } = req.body;
    if (!dealerId) return res.status(400).json({ message: 'dealerId required' });
    
    let chat = await Chat.findOne({ customerId: req.user.sub, dealerId });
    if (chat) return res.json(chat); // Return existing
    
    chat = await Chat.create({
      customerId: req.user.sub,
      dealerId,
      messages: [],
    });
    return res.status(201).json(chat);
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/chats/:id - get chat details
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('customerId', 'name email')
      .populate('dealerId', 'name email profile')
      .populate('dealerRequestId', 'pickupLocation dropLocation distance customerPhone customerDoorNo customerCountry customerState customerDistrict customerMandal customerPincode customerLocationText customerCoordinates pricing quotedPrice licensePlate vehicleType');
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    // Check auth: customer or dealer in chat
    if (chat.customerId._id.toString() !== req.user.sub && chat.dealerId._id.toString() !== req.user.sub) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    return res.json(chat);
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/chats/request/:requestId - get chat by accepted dealer request
router.get('/request/:requestId', requireAuth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ dealerRequestId: req.params.requestId })
      .populate('customerId', 'name email')
      .populate('dealerId', 'name email profile')
      .populate('dealerRequestId', 'pickupLocation dropLocation distance customerPhone customerDoorNo customerCountry customerState customerDistrict customerMandal customerPincode customerLocationText customerCoordinates pricing quotedPrice licensePlate vehicleType');

    if (!chat) return res.status(404).json({ message: 'Chat not found for request' });

    if (chat.customerId._id.toString() !== req.user.sub && chat.dealerId._id.toString() !== req.user.sub) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    return res.json(chat);
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/chats/:id/message - add message
router.post('/:id/message', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Message required' });
    
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    
    // Only customer or dealer can message
    if (chat.customerId.toString() !== req.user.sub && chat.dealerId.toString() !== req.user.sub) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    chat.messages.push({ senderId: req.user.sub, text });
    
    // Accept both dealer final offer and customer counter-offer as negotiable final price candidates
    if (text.includes('Final Price Offer:') || text.includes('Customer counter-offer:')) {
      const priceMatch = text.match(/Rs\.?\s*(\d+(?:\.\d+)?)/i);
      if (priceMatch) {
        const finalPrice = parseFloat(priceMatch[1]);
        chat.negotiation.finalPrice = finalPrice;
        chat.negotiation.customerDecision = 'pending';
        chat.negotiation.dealerDecision = 'pending';
        chat.confirmed = false;
        chat.confirmedAt = null;
      }
    }
    
    await chat.save();
    return res.json(chat);
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/chats/:id/negotiate - customer counter-offer
router.post('/:id/negotiate', requireAuth, async (req, res) => {
  try {
    const { price } = req.body;
    if (!price) return res.status(400).json({ message: 'Price required' });
    
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    
    if (chat.customerId.toString() !== req.user.sub) {
      return res.status(403).json({ message: 'Only customer can negotiate' });
    }

    const finalPrice = parseFloat(price);
    
    // Explicitly update fields to ensure Mongoose detects changes
    if (!chat.negotiation) chat.negotiation = {};
    chat.set('negotiation.finalPrice', finalPrice);
    chat.set('negotiation.offeredPrice', finalPrice);
    chat.set('negotiation.customerDecision', 'confirmed');
    chat.set('negotiation.dealerDecision', 'pending');
    chat.markModified('negotiation');
    
    chat.confirmed = false;
    chat.confirmedAt = null;

    // This message text matches the dealer's getEffectiveFinalPrice regex
    chat.messages.push({
      senderId: req.user.sub,
      text: `Customer counter-offer: Rs.${finalPrice}`,
    });

    await chat.save();
    return res.json(chat);
  } catch (e) {
    console.error('Error negotiating:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/chats/:id/confirm - backward-compatible customer confirm
router.post('/:id/confirm', requireAuth, async (req, res) => {
  try {
    const { finalPrice, vehicle, pickup, drop } = req.body;
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (chat.customerId.toString() !== req.user.sub) {
      return res.status(403).json({ message: 'Only customer can confirm' });
    }
    
    chat.negotiation = {
      ...chat.negotiation,
      finalPrice,
      vehicle,
      pickup,
      drop,
      customerDecision: 'confirmed',
      dealerDecision: chat.negotiation?.dealerDecision || 'pending',
    };

    chat.confirmed = chat.negotiation.dealerDecision === 'confirmed';
    chat.confirmedAt = chat.confirmed ? new Date() : null;
    
    // Update related Order with agreedPrice only after both sides confirm
    if (chat.dealerRequestId && chat.confirmed) {
      await Order.updateOne(
        { dealerRequestId: chat.dealerRequestId },
        { agreedPrice: finalPrice }
      );
    }
    
    await chat.save();
    return res.json(chat);
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/chats/:id/price-decision - customer/dealer confirm or reject negotiated price
router.post('/:id/price-decision', requireAuth, async (req, res) => {
  try {
    const { decision } = req.body;
    if (!['confirm', 'reject'].includes(decision)) {
      return res.status(400).json({ message: 'decision must be confirm or reject' });
    }

    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    const isCustomer = chat.customerId.toString() === req.user.sub;
    const isDealer = chat.dealerId.toString() === req.user.sub;
    if (!isCustomer && !isDealer) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (!chat.negotiation?.finalPrice) {
      // Fallback to initial quote if no negotiation happened
      await chat.populate('dealerRequestId', 'quotedPrice');
      if (chat.dealerRequestId?.quotedPrice) {
        if (!chat.negotiation) chat.negotiation = {};
        chat.negotiation.finalPrice = chat.dealerRequestId.quotedPrice;
      } else {
        return res.status(400).json({ message: 'No negotiated final price yet' });
      }
    }

    const normalized = decision === 'confirm' ? 'confirmed' : 'rejected';
    if (!chat.negotiation) {
      chat.negotiation = {};
    }

    const previousCustomerDecision = chat.negotiation.customerDecision;
    const previousDealerDecision = chat.negotiation.dealerDecision;

    if (isCustomer) {
      chat.negotiation.customerDecision = normalized;
    }
    if (isDealer) {
      chat.negotiation.dealerDecision = normalized;
    }

    if (isCustomer && previousCustomerDecision !== normalized) {
      chat.messages.push({
        senderId: req.user.sub,
        text: normalized === 'confirmed' ? 'Customer confirmed the negotiated price.' : 'Customer rejected the negotiated price.',
      });
    }

    if (isDealer && previousDealerDecision !== normalized) {
      chat.messages.push({
        senderId: req.user.sub,
        text: normalized === 'confirmed' ? 'Dealer confirmed the negotiated price.' : 'Dealer rejected the negotiated price.',
      });
    }

    const bothConfirmed =
      chat.negotiation.customerDecision === 'confirmed' &&
      chat.negotiation.dealerDecision === 'confirmed';
    const anyRejected =
      chat.negotiation.customerDecision === 'rejected' ||
      chat.negotiation.dealerDecision === 'rejected';

    chat.confirmed = bothConfirmed;
    chat.confirmedAt = bothConfirmed ? new Date() : null;

    if (anyRejected) {
      chat.confirmed = false;
      chat.confirmedAt = null;
    }

    await chat.save();

    // Persist agreed price to order only when both customer and dealer confirm
    if (bothConfirmed && chat.dealerRequestId) {
      await Order.updateOne(
        { dealerRequestId: chat.dealerRequestId },
        { agreedPrice: chat.negotiation.finalPrice }
      );
    }

    try {
      if (isCustomer && previousCustomerDecision !== normalized) {
        const dealerUser = await User.findById(chat.dealerId).select('name email').lean();
        const customerUser = await User.findById(chat.customerId).select('name').lean();
        await sendChatDecisionEmail({
          toEmail: dealerUser?.email,
          receiverName: dealerUser?.name || 'Dealer',
          actorName: customerUser?.name || 'Customer',
          actorRole: 'Customer',
          decision: normalized,
          finalPrice: chat.negotiation?.finalPrice,
          appBaseUrl: CLIENT_APP_URL,
        });
      }

      if (isDealer && previousDealerDecision !== normalized) {
        const customerUser = await User.findById(chat.customerId).select('name email').lean();
        const dealerUser = await User.findById(chat.dealerId).select('name').lean();
        await sendChatDecisionEmail({
          toEmail: customerUser?.email,
          receiverName: customerUser?.name || 'Customer',
          actorName: dealerUser?.name || 'Dealer',
          actorRole: 'Dealer',
          decision: normalized,
          finalPrice: chat.negotiation?.finalPrice,
          appBaseUrl: CLIENT_APP_URL,
        });
      }
    } catch (mailErr) {
      console.warn('⚠️ Could not send chat decision email:', mailErr.message);
    }

    return res.json({
      success: true,
      bothConfirmed,
      anyRejected,
      negotiation: chat.negotiation,
      chat,
    });
  } catch (e) {
    console.error('Error updating price decision:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/chats/:id/finalize-price - finalize the negotiated price to Order
router.post('/:id/finalize-price', requireAuth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    
    // Only customer or dealer can finalize
    if (chat.customerId.toString() !== req.user.sub && chat.dealerId.toString() !== req.user.sub) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const finalPrice = chat.negotiation?.finalPrice;
    if (!finalPrice) {
      return res.status(400).json({ message: 'No final price set in negotiation' });
    }
    
    // Find and update the Order with agreedPrice
    if (chat.dealerRequestId) {
      const order = await Order.findOne({ dealerRequestId: chat.dealerRequestId });

      if (order) {
        const itemsTotal = Number(order.summary?.itemsTotal || 0);
        const distanceKm = Number(order.summary?.distanceKm ?? order.delivery?.distance ?? 0);
        const baseCharge = Number(order.summary?.transportBaseFee || finalPrice || 0);
        const customerFinal = Number(finalPrice || 0);
        const shortDistanceNoSubsidy = Number.isFinite(distanceKm) && distanceKm <= 2;

        const dealerPayout = shortDistanceNoSubsidy
          ? customerFinal
          : roundCurrency(Math.max(customerFinal, 0.85 * baseCharge, 60));

        const platformContribution = shortDistanceNoSubsidy
          ? 0
          : roundCurrency(Math.max(0, dealerPayout - customerFinal));

        const batchDiscount = roundCurrency(Math.max(0, baseCharge - customerFinal));
        const platformFee = Number(order.summary?.platformFee);
        const resolvedPlatformFee = Number.isFinite(platformFee)
          ? platformFee
          : calculatePlatformFee(itemsTotal);

        order.agreedPrice = customerFinal;
        order.summary.distanceKm = Number.isFinite(distanceKm) ? distanceKm : 0;
        order.summary.transportFee = customerFinal;
        order.summary.transportFinalFee = customerFinal;
        order.summary.batchDiscount = batchDiscount;
        order.summary.dealerPayout = dealerPayout;
        order.summary.platformContribution = platformContribution;
        order.summary.platformFee = resolvedPlatformFee;
        order.summary.total = itemsTotal + customerFinal + resolvedPlatformFee;

        await order.save();
      }
      
      return res.json({ success: true, message: 'Price finalized', order });
    }
    
    return res.status(400).json({ message: 'No associated order found' });
  } catch (e) {
    console.error('Error finalizing price:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/chats - get chats for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    let chats;
    if (req.user.role === 'dealer') {
      chats = await Chat.find({ dealerId: req.user.sub })
        .populate('customerId', 'name email phone')
        .populate('dealerRequestId', 'pickupLocation dropLocation distance customerPhone customerDoorNo customerCountry customerState customerDistrict customerMandal customerPincode customerLocationText customerCoordinates pricing quotedPrice licensePlate vehicleType')
        .sort({ updatedAt: -1 });
    } else {
      chats = await Chat.find({ customerId: req.user.sub })
        .populate('dealerId', 'name email')
        .populate('dealerRequestId', 'pickupLocation dropLocation distance customerPhone customerDoorNo customerCountry customerState customerDistrict customerMandal customerPincode customerLocationText customerCoordinates pricing quotedPrice licensePlate vehicleType')
        .sort({ updatedAt: -1 });
    }
    return res.json(chats);
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
