import express from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import User from '../models/User.js';
import Crop from '../models/Crop.js';
import Order from '../models/Order.js';
import TransportDealer from '../models/TransportDealer.js';
import { syncRoleProfileFromUser, removeRoleProfilesByUserId } from '../services/roleProfileSync.js';

const router = express.Router();
const ACTIVE_ORDER_STATUSES = ['Confirmed', 'Accepted', 'In Transit', 'Delivered'];
const hasRole = (role) => ({ $or: [{ role }, { roles: role }] });

const getOrderAmount = (order) => {
  if (Number.isFinite(order?.agreedPrice)) return order.agreedPrice;
  if (Number.isFinite(order?.transport?.price)) return order.transport.price;
  return 0;
};

const getDealerBonus = (order) => {
  const bonus = Number(order?.summary?.incentives?.dealerBonus || 0);
  return Number.isFinite(bonus) && bonus > 0 ? bonus : 0;
};

const getFarmerBonus = (order) => {
  const bonus = Number(order?.summary?.incentives?.farmerBonus || 0);
  return Number.isFinite(bonus) && bonus > 0 ? bonus : 0;
};

const getCustomerOrderTotal = (order) => {
  if (Number.isFinite(order?.summary?.total)) return order.summary.total;
  const itemsTotal = Number(order?.summary?.itemsTotal) || 0;
  const transportFee = Number(order?.summary?.transportFee) || Number(order?.agreedPrice) || Number(order?.transport?.price) || 0;
  const platformFee = Number(order?.summary?.platformFee) || 0;
  const fallback = itemsTotal + transportFee + platformFee;
  return Number.isFinite(fallback) ? fallback : 0;
};

// ADMIN-ONLY ROUTES

/**
 * GET /api/admin/dashboard
 * Admins can view admin dashboard
 */
router.get('/dashboard', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const admin = await User.findById(req.user.sub);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    
    // Get user statistics
    const stats = {
      totalUsers: await User.countDocuments(),
      farmers: await User.countDocuments(hasRole('farmer')),
      customers: await User.countDocuments(hasRole('customer')),
      dealers: await User.countDocuments(hasRole('dealer')),
      admins: await User.countDocuments(hasRole('admin')),
      activeUsers: await User.countDocuments({ status: 'active' }),
      blockedUsers: await User.countDocuments({ status: 'blocked' }),
    };
    
    res.json({
      message: 'Admin Dashboard',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
      statistics: stats
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/admin/users
 * Admins can view all users
 */
router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { role, status, page = 1, limit = 10 } = req.query;
    
    let filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    
    const users = await User.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-passwordHash')
      .exec();
    
    const total = await User.countDocuments(filter);
    
    res.json({
      message: 'Users list',
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      }
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/admin/users/:userId/status
 * Admins can change user status (active, blocked, suspended)
 */
router.put('/users/:userId/status', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['active', 'blocked', 'suspended', 'pending'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { status },
      { new: true }
    ).select('-passwordHash');
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    await syncRoleProfileFromUser(user);
    
    res.json({
      message: `User status updated to ${status}`,
      user
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Admins can delete users
 */
router.delete('/users/:userId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await removeRoleProfilesByUserId(user._id);
    
    res.json({
      message: 'User deleted successfully',
      deletedUser: user.name
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/admin/profile
 * Admins can view their profile
 */
router.get('/profile', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const admin = await User.findById(req.user.sub).select('-passwordHash');
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    
    res.json(admin);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/admin/dealers-summary
 * Get dealer accounts with vehicle types and real earnings
 */
router.get('/dealers-summary', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const dealers = await User.find(hasRole('dealer'))
      .select('-passwordHash -passwordReset')
      .lean();

    const dealerIds = dealers.map((d) => d._id).filter(Boolean);
    const transportDealers = await TransportDealer.find({ dealerId: { $in: dealerIds } })
      .select('dealerId vehicles totalTrips isVerified dealerPhone')
      .lean();

    const transportByUserId = new Map(
      transportDealers.map((profile) => [String(profile.dealerId), profile])
    );

    const enrichedDealers = await Promise.all(
      dealers.map(async (dealer) => {
        const dealerId = String(dealer._id);
        const transportProfile = transportByUserId.get(dealerId);

        const orders = await Order.find({
          dealerId: dealer._id,
          status: { $in: ACTIVE_ORDER_STATUSES },
        })
          .select('agreedPrice transport.price transport.vehicle status')
          .lean();

        const totalEarnings = orders.reduce((sum, order) => sum + getOrderAmount(order), 0);
        const totalBonus = orders.reduce((sum, order) => sum + getDealerBonus(order), 0);
        const vehicleTypesFromProfile = Array.from(
          new Set(
            (transportProfile?.vehicles || [])
              .map((v) => String(v?.vehicleType || '').toUpperCase().trim())
              .filter(Boolean)
          )
        );

        const vehicleTypesFromOrders = Array.from(
          new Set(
            (orders || [])
              .map((o) => String(o?.transport?.vehicle || '').toUpperCase().trim())
              .filter(Boolean)
          )
        );

        const vehicleTypes = vehicleTypesFromProfile.length
          ? vehicleTypesFromProfile
          : vehicleTypesFromOrders;

        return {
          ...dealer,
          phone: transportProfile?.dealerPhone || dealer?.profile?.phone || '',
          vehicles: vehicleTypes,
          completedTrips: Number(transportProfile?.totalTrips || 0),
          totalEarnings,
          totalBonus,
          totalPayout: totalEarnings + totalBonus,
          dealerVerified: Boolean(transportProfile?.isVerified),
        };
      })
    );

    res.json({
      success: true,
      users: enrichedDealers,
      count: enrichedDealers.length,
    });
  } catch (e) {
    console.error('❌ Error fetching dealer summary:', e);
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});

/**
 * GET /api/admin/customers-summary
 * Get customer accounts with real order history summary
 */
router.get('/customers-summary', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const customers = await User.find(hasRole('customer'))
      .select('-passwordHash -passwordReset')
      .lean();

    const enrichedCustomers = await Promise.all(
      customers.map(async (customer) => {
        const orders = await Order.find({
          customerId: customer._id,
          status: { $in: ACTIVE_ORDER_STATUSES },
        })
          .select('summary.total summary.itemsTotal summary.transportFee summary.platformFee agreedPrice transport.price createdAt completedAt acceptedAt status')
          .sort({ createdAt: -1 })
          .lean();

        const totalSpent = orders.reduce((sum, order) => sum + getCustomerOrderTotal(order), 0);
        const lastOrderDate = orders[0]?.completedAt || orders[0]?.acceptedAt || orders[0]?.createdAt || null;

        return {
          ...customer,
          phone: customer?.profile?.phone || '',
          location: customer?.profile?.locationText || [customer?.profile?.mandal, customer?.profile?.district, customer?.profile?.state].filter(Boolean).join(', '),
          orders: orders.length,
          totalSpent,
          lastOrder: lastOrderDate,
        };
      })
    );

    res.json({
      success: true,
      users: enrichedCustomers,
      count: enrichedCustomers.length,
    });
  } catch (e) {
    console.error('❌ Error fetching customer summary:', e);
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});

/**
 * GET /api/admin/farmers-with-crops
 * Get all farmers with their crops data
 */
router.get('/farmers-with-crops', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    console.log('📍 Admin fetching farmers with crops');
    
    // Get all farmers
    const farmers = await User.find(hasRole('farmer'))
      .select('-passwordHash -passwordReset')
      .lean();
    
    // For each farmer, fetch their crops
    const farmersWithCrops = await Promise.all(
      farmers.map(async (farmer) => {
        const crops = await Crop.find({ farmerId: farmer._id })
          .select('cropName category pricePerKg availableQuantity status isActive createdAt')
          .lean();

        const farmerOrders = await Order.find({
          farmerId: farmer._id,
          status: { $in: ACTIVE_ORDER_STATUSES },
        })
          .select('summary.incentives')
          .lean();

        const farmerBonusTotal = farmerOrders.reduce((sum, order) => sum + getFarmerBonus(order), 0);
        
        return {
          ...farmer,
          crops: crops || [],
          totalCrops: crops.length,
          activeCrops: crops.filter(c => c.isActive && c.status === 'listed').length,
          deliveredOrders: farmerOrders.length,
          farmerBonusTotal,
        };
      })
    );
    
    console.log(`✅ Fetched ${farmersWithCrops.length} farmers with their crops`);
    
    res.json({
      message: 'Farmers with crops data',
      farmers: farmersWithCrops
    });
  } catch (e) {
    console.error('❌ Error fetching farmers with crops:', e);
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});

/**
 * GET /api/admin/all-crops
 * Get all crops with farmer information
 */
router.get('/all-crops', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    console.log('📍 Admin fetching all crops');
    
    const crops = await Crop.find()
      .populate('farmerId', 'name email profile')
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`✅ Fetched ${crops.length} total crops`);
    
    res.json({
      message: 'All crops data',
      crops
    });
  } catch (e) {
    console.error('❌ Error fetching all crops:', e);
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});

export default router;
