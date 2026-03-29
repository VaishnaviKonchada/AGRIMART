import express from 'express';
import { requireAuth, requireRole, requireRoles } from '../middlewares/auth.js';
import User from '../models/User.js';
import { syncRoleProfileFromUser } from '../services/roleProfileSync.js';

const router = express.Router();

// FARMER-ONLY ROUTES

/**
 * GET /api/farmer/dashboard
 * Farmers can view their dashboard
 */
router.get('/dashboard', requireAuth, requireRole('farmer'), async (req, res) => {
  try {
    const farmer = await User.findById(req.user.sub);
    if (!farmer) return res.status(404).json({ message: 'Farmer not found' });
    
    res.json({
      message: 'Farmer Dashboard',
      farmer: {
        id: farmer._id,
        name: farmer.name,
        email: farmer.email,
        profile: farmer.profile,
      }
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/farmer/profile
 * Farmers can view their profile
 */
router.get('/profile', requireAuth, requireRole('farmer'), async (req, res) => {
  try {
    const farmer = await User.findById(req.user.sub);
    if (!farmer) return res.status(404).json({ message: 'Farmer not found' });
    
    res.json({
      id: farmer._id,
      name: farmer.name,
      email: farmer.email,
      role: farmer.role,
      status: farmer.status,
      profile: farmer.profile,
      createdAt: farmer.createdAt,
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/farmer/profile
 * Farmers can update their profile
 */
router.put('/profile', requireAuth, requireRole('farmer'), async (req, res) => {
  try {
    const { phone, location, avatarUrl } = req.body;
    
    const farmer = await User.findByIdAndUpdate(
      req.user.sub,
      {
        'profile.phone': phone,
        'profile.locationText': location,
        'profile.avatarUrl': avatarUrl,
      },
      { new: true }
    );

    await syncRoleProfileFromUser(farmer);
    
    res.json({
      message: 'Profile updated successfully',
      farmer: farmer.profile
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
