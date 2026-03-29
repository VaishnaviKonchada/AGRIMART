import express from 'express';
import { requireAuth } from '../middlewares/auth.js';
import User from '../models/User.js';
import { syncRoleProfileFromUser } from '../services/roleProfileSync.js';

const router = express.Router();

/**
 * GET /api/users/me
 * Get current logged-in user's profile
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select('-passwordHash -passwordReset');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        country: user.profile?.country || '',
        state: user.profile?.state || '',
        district: user.profile?.district || '',
        mandal: user.profile?.mandal || '',
        pincode: user.profile?.pincode || '',
        location: user.profile?.locationText || '',
        coordinates: user.profile?.coordinates || null,
        phone: user.profile?.phone || '',
        avatarUrl: user.profile?.avatarUrl || '',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    });
  } catch (e) {
    console.error('Error fetching user profile:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/users/profile
 * Update current logged-in user's profile
 */
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const {
      name,
      country,
      state,
      district,
      mandal,
      doorNo,
      pincode,
      location,
      coordinates,
      phone,
    } = req.body;
    
    const updateData = {
      name,
      'profile.country': country,
      'profile.state': state,
      'profile.district': district,
      'profile.mandal': mandal,
      'profile.doorNo': doorNo || '',
      'profile.pincode': pincode,
      'profile.locationText': location,
      'profile.phone': phone,
    };
    
    // Only update coordinates if provided
    if (coordinates && typeof coordinates === 'object') {
      updateData['profile.coordinates'] = coordinates;
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.sub,
      { $set: updateData },
      { new: true }
    ).select('-passwordHash -passwordReset');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await syncRoleProfileFromUser(user);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        country: user.profile?.country || '',
        state: user.profile?.state || '',
        district: user.profile?.district || '',
        mandal: user.profile?.mandal || '',
        pincode: user.profile?.pincode || '',
        location: user.profile?.locationText || '',
        coordinates: user.profile?.coordinates || null,
        phone: user.profile?.phone || '',
      }
    });
  } catch (e) {
    console.error('Error updating user profile:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
