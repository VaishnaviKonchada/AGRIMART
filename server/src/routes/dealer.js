import express from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import User from '../models/User.js';
import TransportDealer from '../models/TransportDealer.js';

const router = express.Router();

const isValidCalendarDate = (day, month, year) => {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

const normalizeInsuranceExpiry = (value) => {
  if (!value) return '';

  const raw = String(value).trim();
  const dmyMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    return isValidCalendarDate(day, month, year) ? raw : '';
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (!isValidCalendarDate(day, month, year)) return '';
    return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${String(year)}`;
  }

  return '';
};

// DEALER-ONLY ROUTES

/**
 * GET /api/dealer/dashboard
 * Dealers can view their dashboard
 */
router.get('/dashboard', requireAuth, requireRole('dealer'), async (req, res) => {
  try {
    const dealer = await User.findById(req.user.sub);
    if (!dealer) return res.status(404).json({ message: 'Dealer not found' });
    
    res.json({
      message: 'Dealer Dashboard',
      dealer: {
        id: dealer._id,
        name: dealer.name,
        email: dealer.email,
        profile: dealer.profile,
      }
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/dealer/profile
 * Dealers can view their profile
 */
router.get('/profile', requireAuth, requireRole('dealer'), async (req, res) => {
  try {
    const dealer = await User.findById(req.user.sub);
    if (!dealer) return res.status(404).json({ message: 'Dealer not found' });
    
    res.json({
      id: dealer._id,
      name: dealer.name,
      email: dealer.email,
      role: dealer.role,
      status: dealer.status,
      profile: dealer.profile,
      createdAt: dealer.createdAt,
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/dealer/profile
 * Dealers can update their profile
 */
router.put('/profile', requireAuth, requireRole('dealer'), async (req, res) => {
  try {
    const { phone, location, avatarUrl } = req.body;
    
    const dealer = await User.findByIdAndUpdate(
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
      dealer: dealer.profile
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/dealer/register-transport
 * Dealer registers their transport details
 * Body: { pickupLocations, dropLocations, bankAccountNumber, bankIFSC, bankAccountHolder, address, city, state, pincode }
 */
router.post('/register-transport', requireAuth, requireRole('dealer'), async (req, res) => {
  try {
    const {
      pickupLocations = [],
      dropLocations = [],
      bankAccountNumber,
      bankIFSC,
      bankAccountHolder,
      address,
      city,
      state,
      pincode,
      alternatePhone,
    } = req.body;

    // ✅ Check if dealer already registered
    let transportDealer = await TransportDealer.findOne({ dealerId: req.user.sub });
    const user = await User.findById(req.user.sub);

    if (!transportDealer) {
      transportDealer = new TransportDealer({
        dealerId: req.user.sub,
        dealerName: user.name,
        dealerEmail: user.email,
        dealerPhone: user.profile?.phone,
        dealerPhoto: user.profile?.avatarUrl,
        pickupLocations: pickupLocations || [],
        dropLocations: dropLocations || [],
        bankAccountNumber,
        bankIFSC,
        bankAccountHolder,
        address,
        city,
        state,
        pincode,
        alternatePhone,
        vehicles: [],
      });
    } else {
      // Update existing
      transportDealer.pickupLocations = pickupLocations || transportDealer.pickupLocations;
      transportDealer.dropLocations = dropLocations || transportDealer.dropLocations;
      transportDealer.bankAccountNumber = bankAccountNumber || transportDealer.bankAccountNumber;
      transportDealer.bankIFSC = bankIFSC || transportDealer.bankIFSC;
      transportDealer.bankAccountHolder = bankAccountHolder || transportDealer.bankAccountHolder;
      transportDealer.address = address || transportDealer.address;
      transportDealer.city = city || transportDealer.city;
      transportDealer.state = state || transportDealer.state;
      transportDealer.pincode = pincode || transportDealer.pincode;
      transportDealer.alternatePhone = alternatePhone || transportDealer.alternatePhone;
    }

    await transportDealer.save();

    console.log(`✅ Dealer ${user.name} registered transport details`);

    res.json({
      success: true,
      message: 'Transport details registered successfully',
      dealerId: transportDealer._id,
    });

  } catch (error) {
    console.error('❌ Error registering transport:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/dealer/add-vehicle
 * Dealer adds a vehicle to their fleet
 * Body: { vehicleType, licensePlate, capacity, basePrice, perKmPrice, pricePerKg, vehicleName, year, insuranceExpiry, quantity, status, documentVerified }
 */
router.post('/add-vehicle', requireAuth, requireRole('dealer'), async (req, res) => {
  try {
    const {
      vehicleType,
      licensePlate,
      capacity,
      basePrice,
      perKmPrice,
      pricePerKg,
      vehicleName,
      year,
      insuranceExpiry,
      quantity,
      status,
      documentVerified,
    } = req.body;

    if (insuranceExpiry) {
      const normalizedInsuranceExpiry = normalizeInsuranceExpiry(insuranceExpiry);
      if (!normalizedInsuranceExpiry) {
        return res.status(400).json({ error: 'Insurance expiry must be a valid DD-MM-YYYY date' });
      }
      req.body.insuranceExpiry = normalizedInsuranceExpiry;
    }

    if (!vehicleType || !licensePlate || !capacity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let transportDealer = await TransportDealer.findOne({ dealerId: req.user.sub });
    if (!transportDealer) {
      const user = await User.findById(req.user.sub);
      if (!user) {
        return res.status(404).json({ error: 'Dealer not found' });
      }
      transportDealer = new TransportDealer({
        dealerId: req.user.sub,
        dealerName: user.name,
        dealerEmail: user.email,
        dealerPhone: user.profile?.phone,
        dealerPhoto: user.profile?.avatarUrl,
        pickupLocations: [],
        dropLocations: [],
        vehicles: [],
      });
    }

    // ✅ Check if vehicle already exists
    const normalizedVehicleType = vehicleType.toUpperCase();
    const existingVehicle = transportDealer.vehicles.find(v => v.licensePlate === licensePlate);
    if (existingVehicle) {
      return res.status(400).json({ error: 'Vehicle with this registration already exists' });
    }

    // ✅ Add vehicle
    transportDealer.vehicles.push({
      vehicleName: vehicleName || '',
      vehicleType: normalizedVehicleType,
      licensePlate,
      capacity,
      year,
      insuranceExpiry: req.body.insuranceExpiry || '',
      quantity: quantity || 1,
      status: status || 'Active',
      documentVerified: !!documentVerified,
      basePrice: basePrice || 0,
      perKmPrice: perKmPrice || 10,
      pricePerKg: pricePerKg || 0,
      isActive: true,
      isVisibleToCustomers: typeof req.body.isVisibleToCustomers === 'boolean'
        ? req.body.isVisibleToCustomers
        : true,
      pickupLocations: [],
      dropLocations: [],
    });

    await transportDealer.save();

    console.log(`✅ Vehicle added: ${normalizedVehicleType} (${licensePlate})`);

    res.json({
      success: true,
      message: 'Vehicle added successfully',
      vehicle: transportDealer.vehicles[transportDealer.vehicles.length - 1],
    });

  } catch (error) {
    console.error('❌ Error adding vehicle:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/dealer/vehicles
 * Get dealer's vehicles
 */
router.get('/vehicles', requireAuth, requireRole('dealer'), async (req, res) => {
  try {
    const transportDealer = await TransportDealer.findOne({ dealerId: req.user.sub });
    if (!transportDealer) {
      return res.json({
        success: true,
        vehicles: [],
      });
    }

    res.json({
      success: true,
      vehicles: transportDealer.vehicles.map((vehicle) => ({
        ...vehicle.toObject(),
        insuranceExpiry: normalizeInsuranceExpiry(vehicle.insuranceExpiry) || vehicle.insuranceExpiry || '',
      })),
    });

  } catch (error) {
    console.error('❌ Error fetching vehicles:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/dealer/vehicles/:vehicleId
 * Update dealer vehicle (details, service areas, visibility)
 */
router.put('/vehicles/:vehicleId', requireAuth, requireRole('dealer'), async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const transportDealer = await TransportDealer.findOne({ dealerId: req.user.sub });
    if (!transportDealer) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    const vehicle = transportDealer.vehicles.id(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const updates = req.body || {};
    if (updates.vehicleType) {
      updates.vehicleType = updates.vehicleType.toUpperCase();
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'insuranceExpiry')) {
      if (!updates.insuranceExpiry) {
        updates.insuranceExpiry = '';
      } else {
        const normalizedInsuranceExpiry = normalizeInsuranceExpiry(updates.insuranceExpiry);
        if (!normalizedInsuranceExpiry) {
          return res.status(400).json({ error: 'Insurance expiry must be a valid DD-MM-YYYY date' });
        }
        updates.insuranceExpiry = normalizedInsuranceExpiry;
      }
    }

    Object.keys(updates).forEach((key) => {
      vehicle[key] = updates[key];
    });

    await transportDealer.save();

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      vehicle: {
        ...vehicle.toObject(),
        insuranceExpiry: normalizeInsuranceExpiry(vehicle.insuranceExpiry) || vehicle.insuranceExpiry || '',
      },
    });
  } catch (error) {
    console.error('❌ Error updating vehicle:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/dealer/vehicles/:vehicleId
 * Delete dealer vehicle
 */
router.delete('/vehicles/:vehicleId', requireAuth, requireRole('dealer'), async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const transportDealer = await TransportDealer.findOne({ dealerId: req.user.sub });
    if (!transportDealer) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    const vehicle = transportDealer.vehicles.id(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    vehicle.deleteOne();
    await transportDealer.save();

    res.json({
      success: true,
      message: 'Vehicle deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting vehicle:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/dealer/transport-profile
 * Get dealer's complete transport profile
 */
router.get('/transport-profile', requireAuth, requireRole('dealer'), async (req, res) => {
  try {
    const transportDealer = await TransportDealer.findOne({ dealerId: req.user.sub });
    if (!transportDealer) {
      return res.status(404).json({ error: 'Transport profile not found' });
    }

    res.json({
      success: true,
      profile: transportDealer,
    });

  } catch (error) {
    console.error('❌ Error fetching transport profile:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
