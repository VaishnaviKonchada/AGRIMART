import express from 'express';
import mongoose from 'mongoose';
import Crop from '../models/Crop.js';
import Order from '../models/Order.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { getCropCatalog, getCropVarieties } from '../data/cropVarieties.js';
import { attachMandiReferenceToCrops, fetchLatestMandiReference } from '../services/mandiPriceService.js';

const router = express.Router();
const MANDI_REFRESH_MINUTES = Number(process.env.MANDI_REFRESH_MINUTES || 30);
const mandiMaxAgeHours = Math.max(5, MANDI_REFRESH_MINUTES) / 60;

// ============ PUBLIC ROUTES ============

// GET /api/crops - List all active crops (for customers)
router.get('/', async (req, res) => {
  try {
    console.log('📍 GET /api/crops - Fetching all active crops');
    const { category, search, minPrice, maxPrice } = req.query;
    
    let filter = { isActive: true, status: 'listed', availableQuantity: { $gt: 0 } };
    
    // Filter by category
    if (category) {
      filter.category = category;
    }
    
    // Filter by price range
    if (minPrice || maxPrice) {
      filter.pricePerKg = {};
      if (minPrice) filter.pricePerKg.$gte = parseFloat(minPrice);
      if (maxPrice) filter.pricePerKg.$lte = parseFloat(maxPrice);
    }
    
    // Search by name or description
    if (search) {
      filter.$text = { $search: search };
    }
    
    const crops = await Crop.find(filter)
      .populate('farmerId', 'name email profile')
      .sort({ createdAt: -1 })
      .lean();

    await attachMandiReferenceToCrops(crops, Crop, { maxAgeHours: mandiMaxAgeHours });
    
    console.log(`✅ Found ${crops.length} crops`);
    return res.json(crops);
  } catch (e) {
    console.error('❌ Error fetching crops:', e.message);
    return res.status(500).json({ message: 'Server error fetching crops', error: e.message });
  }
});

// GET /api/crops/varieties?cropName=tomato&category=Vegetable
router.get('/varieties', async (req, res) => {
  try {
    const cropName = (req.query.cropName || '').toString().trim();
    const rawCategory = (req.query.category || '').toString().trim().toLowerCase();

    if (!cropName) {
      return res.status(400).json({ message: 'cropName query parameter is required' });
    }

    const categoryMap = {
      vegetable: 'vegetable',
      fruit: 'fruit',
      pulse: 'pulse',
      grain: 'grain',
      spice: 'spice',
      herb: 'spice',
      other: '',
      crop: 'grain'
    };

    const normalizedCategory = categoryMap[rawCategory] || '';
    const varieties = getCropVarieties(cropName, normalizedCategory);

    return res.json({
      cropName,
      category: normalizedCategory || null,
      varieties
    });
  } catch (e) {
    console.error('❌ Error fetching crop varieties:', e.message);
    return res.status(500).json({ message: 'Server error fetching crop varieties', error: e.message });
  }
});

// GET /api/crops/catalog?category=Fruit
router.get('/catalog', async (req, res) => {
  try {
    const rawCategory = (req.query.category || '').toString().trim().toLowerCase();
    const categoryMap = {
      vegetable: 'vegetable',
      fruit: 'fruit',
      pulse: 'pulse',
      grain: 'grain',
      spice: 'spice',
      herb: 'spice',
      other: '',
      crop: 'grain'
    };

    const normalizedCategory = categoryMap[rawCategory] || '';
    const crops = getCropCatalog(normalizedCategory);

    return res.json({
      category: normalizedCategory || null,
      crops,
    });
  } catch (e) {
    console.error('❌ Error fetching crop catalog:', e.message);
    return res.status(500).json({ message: 'Server error fetching crop catalog', error: e.message });
  }
});

router.get('/mandi-price', async (req, res) => {
  try {
    const commodity = (req.query.commodity || '').toString().trim();
    if (!commodity) return res.status(400).json({ message: 'commodity query param is required' });

    const mandiReference = await fetchLatestMandiReference(commodity);
    return res.json(mandiReference);
  } catch (e) {
    console.error('❌ Mandi price fetch error:', e.message);
    return res.status(500).json({ message: 'Error fetching mandi price', error: e.message });
  }
});

// GET /api/crops/:id - Get single crop details
router.get('/:id', async (req, res) => {
  try {
    console.log('📍 GET /api/crops/:id - Fetching crop:', req.params.id);
    const crop = await Crop.findById(req.params.id)
      .populate('farmerId', 'name email profile');
    
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }
    
    console.log(`✅ Crop fetched: ${crop.cropName}`);
    return res.json(crop);
  } catch (e) {
    console.error('❌ Error fetching crop:', e.message);
    return res.status(500).json({ message: 'Server error', error: e.message });
  }
});

// ============ FARMER PUBLIC ENDPOINTS ============

// GET /api/farmers/:farmerId - Get farmer profile with location details
router.get('/farmers/:farmerId', async (req, res) => {
  try {
    const User = (await import('../models/User.js')).default;
    
    // Try to find farmer by MongoDB ObjectId first
    let farmer = await User.findById(req.params.farmerId);
    
    if (!farmer) {
      return res.status(404).json({ 
        message: 'Farmer not found',
        farmerId: req.params.farmerId 
      });
    }

    res.json({
      _id: farmer._id,
      name: farmer.name,
      email: farmer.email,
      phone: farmer.profile?.phone || '',
      state: farmer.profile?.state || '',
      district: farmer.profile?.district || '',
      mandal: farmer.profile?.mandal || '',
      doorNo: farmer.profile?.doorNo || '',
      location: farmer.profile?.locationText || farmer.profile?.location || '',
      pincode: farmer.profile?.pincode || '',
      country: farmer.profile?.country || '',
      createdAt: farmer.createdAt
    });
  } catch (e) {
    console.error('❌ Error fetching farmer:', e.message);
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});

// GET /api/farmers/:farmerId/crops - Get all crops from a farmer
router.get('/farmers/:farmerId/crops', async (req, res) => {
  try {
    const crops = await Crop.find({
      farmerId: req.params.farmerId,
      isActive: true,
      status: 'listed'
    }).select(
      'cropName variety category quantity availableQuantity unit pricePerKg minOrder minimumOrderQuantity moisture moisturePercentage storageType organic isOrganic quality description guidance guidanceLanguage photos images createdAt updatedAt'
    ).lean();

    await attachMandiReferenceToCrops(crops, Crop, { maxAgeHours: mandiMaxAgeHours });

    console.log(`✅ Found ${crops.length} crops for farmer ${req.params.farmerId}`);
    res.json(crops || []);
  } catch (e) {
    console.error('❌ Error fetching farmer crops:', e.message);
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});

// ============ FARMER ROUTES (AUTHENTICATED) ============

// POST /api/crops - Create new crop (farmer only)
router.post('/', requireAuth, requireRole('farmer'), async (req, res) => {
  try {
    console.log('📍 POST /api/crops - Creating crop for farmer:', req.user.sub);
    
    const {
      cropName,
      variety,
      category,
      pricePerKg,
      availableQuantity,
      minimumOrderQuantity,
      description,
      guidance,
      guidanceLanguage,
      images,
      isOrganic,
      quality,
      productionDate,
      expiryDate,
      moisturePercentage,
      irrigationMethod,
      fertilizerUsed,
      storageType,
      farmerLocation
    } = req.body;
    
    // Validation
    if (!cropName || !category || !pricePerKg || !availableQuantity) {
      return res.status(400).json({
        message: 'Missing required fields: cropName, category, pricePerKg, availableQuantity'
      });
    }
    
    if (pricePerKg < 0 || availableQuantity < 0) {
      return res.status(400).json({
        message: 'Price and quantity must be positive numbers'
      });
    }
    
    // Fetch farmer details from User model
    const User = (await import('../models/User.js')).default;
    const farmer = await User.findById(req.user.sub);
    
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }
    
    // Create crop with farmer details
    const crop = await Crop.create({
      farmerId: req.user.sub,
      farmerName: farmer.name,
      farmerEmail: farmer.email,
      farmerPhone: farmer.profile?.phone || '',
      farmerLocation: farmerLocation || farmer.profile?.locationText || '',
      farmerState: farmer.profile?.state || '',
      farmerDistrict: farmer.profile?.district || '',
      farmerMandal: farmer.profile?.mandal || '',
      farmerDoorNo: farmer.profile?.doorNo || '',
      farmerPincode: farmer.profile?.pincode || '',
      cropName: cropName.trim(),
      variety: variety?.trim() || '',
      category,
      pricePerKg: parseFloat(pricePerKg),
      totalQuantity: parseFloat(availableQuantity),
      availableQuantity: parseFloat(availableQuantity),
      minimumOrderQuantity: minimumOrderQuantity ? parseFloat(minimumOrderQuantity) : 1,
      description: description || '',
      guidance: guidance || '',
      guidanceLanguage: guidanceLanguage || 'en',
      images: images || [],
      isOrganic: isOrganic || false,
      quality: quality || 'Standard',
      productionDate: productionDate ? new Date(productionDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      moisturePercentage: moisturePercentage ? parseFloat(moisturePercentage) : undefined,
      irrigationMethod: irrigationMethod?.trim() || '',
      fertilizerUsed: fertilizerUsed?.trim() || '',
      storageType: storageType?.trim() || '',
      mandiReference: null,
      status: 'listed',
      isActive: true
    });

    const mandiReference = await fetchLatestMandiReference(crop.cropName);
    crop.mandiReference = mandiReference.found ? mandiReference : null;
    await crop.save();
    
    console.log(`✅ Crop created: ${crop._id} by farmer ${farmer.name}`);
    return res.status(201).json({
      message: 'Crop created successfully',
      crop
    });
  } catch (e) {
    console.error('❌ Error creating crop:', e.message);
    return res.status(500).json({
      message: 'Server error creating crop',
      error: e.message
    });
  }
});

// PUT /api/crops/:id - Update crop (farmer only)
router.put('/:id', requireAuth, requireRole('farmer'), async (req, res) => {
  try {
    console.log('📍 PUT /api/crops/:id - Updating crop:', req.params.id);
    
    const crop = await Crop.findById(req.params.id);
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }
    
    // Authorization: only farmer who created it can update
    if (crop.farmerId.toString() !== req.user.sub) {
      console.log('❌ Unauthorized - farmer trying to update another farmer\'s crop');
      return res.status(403).json({ message: 'Unauthorized: You can only update your own crops' });
    }
    
    // Update allowed fields
    const {
      cropName,
      category,
      pricePerKg,
      availableQuantity,
      description,
      images,
      isOrganic,
      quality,
      isActive,
      status
    } = req.body;
    
    if (cropName) crop.cropName = cropName.trim();
    if (category) crop.category = category;
    if (pricePerKg !== undefined) crop.pricePerKg = parseFloat(pricePerKg);
    if (availableQuantity !== undefined) {
      const nextAvailableQuantity = parseFloat(availableQuantity);
      const currentTotalQuantity = Number(crop.totalQuantity ?? crop.availableQuantity ?? 0);

      crop.availableQuantity = nextAvailableQuantity;
      if (!Number.isFinite(currentTotalQuantity) || nextAvailableQuantity > currentTotalQuantity) {
        crop.totalQuantity = nextAvailableQuantity;
      }
    }
    if (description !== undefined) crop.description = description;
    if (images) crop.images = images;
    if (isOrganic !== undefined) crop.isOrganic = isOrganic;
    if (quality) crop.quality = quality;
    if (isActive !== undefined) crop.isActive = isActive;
    if (status) crop.status = status;

    const mandiReference = await fetchLatestMandiReference(crop.cropName);
    crop.mandiReference = mandiReference.found ? mandiReference : null;
    
    await crop.save();
    
    console.log(`✅ Crop updated: ${crop._id}`);
    return res.json({
      message: 'Crop updated successfully',
      crop
    });
  } catch (e) {
    console.error('❌ Error updating crop:', e.message);
    return res.status(500).json({
      message: 'Server error updating crop',
      error: e.message
    });
  }
});

// DELETE /api/crops/:id - Delete crop (farmer only)
router.delete('/:id', requireAuth, requireRole('farmer'), async (req, res) => {
  try {
    console.log('📍 DELETE /api/crops/:id - Deleting crop:', req.params.id);
    
    const crop = await Crop.findById(req.params.id);
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }
    
    // Authorization: only farmer who created it can delete
    if (crop.farmerId.toString() !== req.user.sub) {
      console.log('❌ Unauthorized - farmer trying to delete another farmer\'s crop');
      return res.status(403).json({ message: 'Unauthorized: You can only delete your own crops' });
    }
    
    await Crop.findByIdAndDelete(req.params.id);
    
    console.log(`✅ Crop deleted: ${crop._id}`);
    return res.json({ message: 'Crop deleted successfully' });
  } catch (e) {
    console.error('❌ Error deleting crop:', e.message);
    return res.status(500).json({
      message: 'Server error deleting crop',
      error: e.message
    });
  }
});

// GET /api/crops/my-crops - Get logged-in farmer's crops
router.get('/my-crops/list', requireAuth, requireRole('farmer'), async (req, res) => {
  try {
    console.log('📍 GET /api/crops/my-crops - Fetching my crops');
    
    const crops = await Crop.find({ farmerId: req.user.sub })
      .sort({ createdAt: -1 })
      .lean();

    const cropIds = crops.map((crop) => crop._id).filter(Boolean);
    let soldByCropMap = new Map();

    if (cropIds.length > 0) {
      const soldByCrop = await Order.aggregate([
        {
          $match: {
            farmerId: new mongoose.Types.ObjectId(req.user.sub),
            status: { $nin: ['Cancelled', 'Rejected'] },
          },
        },
        { $unwind: '$items' },
        {
          $match: {
            'items.cropId': { $in: cropIds },
          },
        },
        {
          $group: {
            _id: '$items.cropId',
            soldQuantity: { $sum: { $ifNull: ['$items.quantity', 0] } },
          },
        },
      ]);

      soldByCropMap = new Map(
        soldByCrop.map((entry) => [String(entry._id), Number(entry.soldQuantity || 0)])
      );
    }

    const enrichedCrops = crops.map((crop) => {
      const availableQuantity = Number(crop.availableQuantity || 0);
      const soldFromOrders = Number(soldByCropMap.get(String(crop._id)) || 0);
      const explicitTotal = Number(crop.totalQuantity);
      const totalQuantity = Number.isFinite(explicitTotal) && explicitTotal >= availableQuantity
        ? explicitTotal
        : availableQuantity + soldFromOrders;

      return {
        ...crop,
        totalQuantity,
        soldQuantity: Math.max(totalQuantity - availableQuantity, 0),
      };
    });
    
    console.log(`✅ Found ${enrichedCrops.length} crops for current farmer`);
    return res.json(enrichedCrops);
  } catch (e) {
    console.error('❌ Error fetching my crops:', e.message);
    return res.status(500).json({
      message: 'Server error',
      error: e.message
    });
  }
});

export default router;
