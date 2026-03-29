import express from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import User from '../models/User.js';

const router = express.Router();

// CUSTOMER-ONLY ROUTES

/**
 * GET /api/customer/dashboard
 * Customers can view their dashboard
 */
router.get('/dashboard', requireAuth, requireRole('customer'), async (req, res) => {
  try {
    const customer = await User.findById(req.user.sub);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    
    res.json({
      message: 'Customer Dashboard',
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        profile: customer.profile,
      }
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/customer/profile
 * Customers can view their profile
 */
router.get('/profile', requireAuth, requireRole('customer'), async (req, res) => {
  try {
    const customer = await User.findById(req.user.sub);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    
    res.json({
      id: customer._id,
      name: customer.name,
      email: customer.email,
      role: customer.role,
      status: customer.status,
      profile: customer.profile,
      createdAt: customer.createdAt,
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/customer/profile
 * Customers can update their profile
 */
router.put('/profile', requireAuth, requireRole('customer'), async (req, res) => {
  try {
    const { phone, location, avatarUrl } = req.body;
    
    const customer = await User.findByIdAndUpdate(
      req.user.sub,
      {
        'profile.phone': phone,
        'profile.location': location,
        'profile.avatarUrl': avatarUrl,
      },
      { new: true }
    );
    
    res.json({
      message: 'Profile updated successfully',
      customer: customer.profile
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
