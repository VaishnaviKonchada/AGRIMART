import express from 'express';
import Payment from '../models/Payment.js';
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();

// GET /api/payments - get customer payment history
router.get('/', requireAuth, async (req, res) => {
  try {
    const payments = await Payment.find({ customerId: req.user.sub })
      .populate('orderId', 'id total status')
      .sort({ createdAt: -1 });
    return res.json(payments);
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/payments - create payment record (called after order)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { orderId, amount, dealerId } = req.body;
    if (!orderId || !amount) return res.status(400).json({ message: 'orderId and amount required' });
    
    const payment = await Payment.create({
      orderId,
      customerId: req.user.sub,
      dealerId,
      amount,
      status: 'Completed',
    });
    return res.status(201).json(payment);
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
