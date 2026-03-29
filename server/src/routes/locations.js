/**
 * AP Districts & Mandals API Routes
 * Provides search and filtering for all 28 districts and 681 mandals from MongoDB
 */

import express from 'express';
import District from '../models/District.js';
import Mandal from '../models/Mandal.js';
import { importDistricts, importMandals } from '../services/csvImportService.js';

const router = express.Router();

/**
 * POST /api/locations/import-data
 * Import districts and mandals from CSV to MongoDB (Admin only)
 */
router.post('/import-data', async (req, res) => {
  try {
    const force = req.query.force === 'true' || req.body?.force === true;
    const results = {
      districts: null,
      mandals: null,
    };

    try {
      results.districts = await importDistricts(force);
    } catch (err) {
      console.error('Districts import error:', err.message);
      results.districts = `Error: ${err.message}`;
    }

    try {
      results.mandals = await importMandals(force);
    } catch (err) {
      console.error('Mandals import error:', err.message);
      results.mandals = `Error: ${err.message}`;
    }

    res.json({
      success: true,
      message: 'Data import completed',
      results,
    });
  } catch (error) {
    console.error('❌ Error importing data:', error.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * GET /api/locations/districts
 * Get all 28 Andhra Pradesh districts from database
 * Optional query: search (to filter districts by name)
 */
router.get('/districts', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query.district = { $regex: search, $options: 'i' };
    }

    const districts = await District.find(query).sort({ district: 1 }).select('-__v');
    const counts = await Mandal.aggregate([
      { $group: { _id: '$district', count: { $sum: 1 } } }
    ]);
    const countMap = counts.reduce((acc, item) => {
      acc[item._id.toLowerCase()] = item.count;
      return acc;
    }, {});

    const districtsWithCounts = districts.map(d => {
      const key = d.district.toLowerCase();
      const computedCount = countMap[key] || 0;
      return {
        ...d.toObject(),
        mandalCount: computedCount || d.mandalCount || 0,
      };
    });

    res.json({
      success: true,
      count: districtsWithCounts.length,
      districts: districtsWithCounts,
    });
  } catch (error) {
    console.error('❌ Error fetching districts:', error.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * GET /api/locations/mandals/:district
 * Get all mandals for a specific district from database
 * Optional query: search (to filter mandals by name)
 */
router.get('/mandals/:district', async (req, res) => {
  try {
    const { district } = req.params;
    const { search } = req.query;
    let query = { district: { $regex: `^${district}$`, $options: 'i' } };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const mandals = await Mandal.find(query).sort({ name: 1 }).select('-__v');

    if (mandals.length === 0) {
      return res.status(404).json({
        success: false,
        error: `District "${district}" not found. Please check spelling.`,
        count: 0,
        mandals: [],
      });
    }

    res.json({
      success: true,
      district,
      count: mandals.length,
      mandals,
    });
  } catch (error) {
    console.error('❌ Error fetching mandals:', error.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * GET /api/locations/coordinates
 * Get coordinates for a specific mandal
 * Query: district, mandal
 */
router.get('/coordinates', async (req, res) => {
  try {
    const { district, mandal } = req.query;

    if (!district || !mandal) {
      return res.status(400).json({
        success: false,
        error: 'Both district and mandal are required',
      });
    }

    const mandalRecord = await Mandal.findOne(
      {
        district: { $regex: `^${district}$`, $options: 'i' },
        name: { $regex: `^${mandal}$`, $options: 'i' },
      },
      'coordinates'
    );

    if (!mandalRecord) {
      return res.status(404).json({
        success: false,
        error: `Mandal "${mandal}" not found in district "${district}"`,
      });
    }

    res.json({
      success: true,
      district,
      mandal,
      coordinates: mandalRecord.coordinates || { lat: null, lng: null },
    });
  } catch (error) {
    console.error('❌ Error fetching coordinates:', error.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * GET /api/locations/reverse-geocode
 * Get address and pincode from coordinates using Nominatim
 * Query: lat, lng
 */
router.get('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: 'lat and lng are required' });
    }

    // Try zoom level 18 for maximum detail
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&addressdetails=1&zoom=18`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AgriMart/1.0 (support@agrimart.local)' }
    });

    if (!response.ok) {
      return res.status(502).json({ success: false, error: 'Failed to reverse geocode' });
    }

    const data = await response.json();
    const address = data.address || {};

    console.log('🗺️ Geocoding response for', lat, lng);
    console.log('Address components:', JSON.stringify(address, null, 2));

    // Build location text prioritizing most specific components
    const locationParts = [];
    
    // Priority 1: Most granular location identifiers
    if (address.house_number) locationParts.push(address.house_number);
    if (address.road) locationParts.push(address.road);
    
    // Priority 2: Local area identifiers (often more accurate than administrative)
    if (address.suburb) locationParts.push(address.suburb);
    if (address.neighbourhood) locationParts.push(address.neighbourhood);
    if (address.hamlet) locationParts.push(address.hamlet);
    if (address.village) locationParts.push(address.village);
    if (address.residential) locationParts.push(address.residential);
    
    // Priority 3: Town/City level
    if (address.town) locationParts.push(address.town);
    if (address.city && !locationParts.includes(address.city)) locationParts.push(address.city);
    if (address.municipality) locationParts.push(address.municipality);
    
    // Create concise location (first 3-4 components)
    const locationText = locationParts.slice(0, 4).join(', ') || data.display_name || `${lat}, ${lng}`;

    // Alternative format focusing on colony/area names
    const alternativeLocationParts = [];
    if (address.residential) alternativeLocationParts.push(address.residential);
    if (address.suburb) alternativeLocationParts.push(address.suburb);
    if (address.neighbourhood) alternativeLocationParts.push(address.neighbourhood);
    if (address.village) alternativeLocationParts.push(address.village);
    if (address.town || address.city) alternativeLocationParts.push(address.town || address.city);
    
    const alternativeLocation = alternativeLocationParts.length > 0 
      ? alternativeLocationParts.slice(0, 3).join(', ') 
      : null;

    const normalizeSuggestion = (value) => String(value || '').trim();
    const isLikelyLandmark = (value) => {
      const text = normalizeSuggestion(value);
      if (!text) return false;

      // Avoid noisy administrative/address fragments being shown as "famous".
      if (text.length < 3 || text.length > 64) return false;

      const lower = text.toLowerCase();
      const blockedExact = new Set([
        'yes',
        'unknown',
        'residential',
        'industrial',
        'commercial',
        'house',
        'building',
        'road',
        'street',
        'service road',
        'area',
        'place',
      ]);

      if (blockedExact.has(lower)) return false;
      if (text.includes(',')) return false;
      if (/^\d+$/.test(text)) return false;

      return true;
    };
    const dedupeSuggestions = (list) => {
      const seen = new Set();
      const output = [];
      for (const item of list) {
        const normalized = normalizeSuggestion(item);
        if (!normalized) continue;
        const key = normalized.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        output.push(normalized);
      }
      return output;
    };

    const cityLike = address.town || address.city || address.village || address.municipality || '';
    const districtLike = address.state_district || address.county || '';

    const nearbySuggestions = dedupeSuggestions([
      locationText,
      alternativeLocation,
      address.residential ? `${address.residential}${cityLike ? `, ${cityLike}` : ''}` : '',
      address.suburb ? `${address.suburb}${cityLike ? `, ${cityLike}` : ''}` : '',
      address.neighbourhood ? `${address.neighbourhood}${cityLike ? `, ${cityLike}` : ''}` : '',
      address.road ? `${address.road}${cityLike ? `, ${cityLike}` : ''}` : '',
      cityLike,
      districtLike,
    ]);

    // Nominatim occasionally includes POI-like keys under address details.
    // Keep only values that look like real landmark names.
    const famousNearby = dedupeSuggestions([
      address.attraction,
      address.tourism,
      address.amenity,
      address.historic,
      address.leisure,
      address.shop,
    ]).filter(isLikelyLandmark).slice(0, 5);

    return res.json({
      success: true,
      locationText: locationText,
      alternativeLocation: alternativeLocation,
      nearbySuggestions,
      famousNearby,
      fullAddress: data.display_name,
      pincode: address.postcode || '',
      district: address.state_district || address.county || '',
      state: address.state || '',
      country: address.country || '',
      detailedAddress: {
        houseNumber: address.house_number || '',
        road: address.road || '',
        neighbourhood: address.neighbourhood || '',
        suburb: address.suburb || '',
        residential: address.residential || '',
        village: address.village || '',
        hamlet: address.hamlet || '',
        town: address.town || '',
        city: address.city || '',
        municipality: address.municipality || ''
      }
    });
  } catch (error) {
    console.error('❌ Error reverse geocoding:', error.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /api/locations/calculate-distance
 * Calculate distance between pickup and drop locations
 * Body: { pickupDistrict, pickupMandal, dropDistrict, dropMandal }
 */
router.post('/calculate-distance', async (req, res) => {
  try {
    const { pickupDistrict, pickupMandal, dropDistrict, dropMandal } = req.body;

    if (!pickupDistrict || !pickupMandal || !dropDistrict || !dropMandal) {
      return res.status(400).json({
        success: false,
        error: 'All fields required: pickupDistrict, pickupMandal, dropDistrict, dropMandal',
      });
    }

    // Get pickup coordinates
    const pickupRecord = await Mandal.findOne(
      {
        district: { $regex: `^${pickupDistrict}$`, $options: 'i' },
        name: { $regex: `^${pickupMandal}$`, $options: 'i' },
      },
      'coordinates'
    );

    // Get drop coordinates
    const dropRecord = await Mandal.findOne(
      {
        district: { $regex: `^${dropDistrict}$`, $options: 'i' },
        name: { $regex: `^${dropMandal}$`, $options: 'i' },
      },
      'coordinates'
    );

    if (!pickupRecord) {
      return res.status(404).json({
        success: false,
        error: `Pickup location "${pickupMandal}" not found in "${pickupDistrict}"`,
      });
    }

    if (!dropRecord) {
      return res.status(404).json({
        success: false,
        error: `Drop location "${dropMandal}" not found in "${dropDistrict}"`,
      });
    }

    const pickupCoords = pickupRecord.coordinates;
    const dropCoords = dropRecord.coordinates;

    if (!pickupCoords || !dropCoords) {
      return res.status(400).json({
        success: false,
        error: 'Coordinates not available for one or both locations',
      });
    }

    // Calculate distance using Haversine formula
    const distance = calculateHaversineDistance(
      pickupCoords.lat,
      pickupCoords.lng,
      dropCoords.lat,
      dropCoords.lng
    );

    res.json({
      success: true,
      pickup: {
        district: pickupDistrict,
        mandal: pickupMandal,
        coordinates: pickupCoords,
      },
      drop: {
        district: dropDistrict,
        mandal: dropMandal,
        coordinates: dropCoords,
      },
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal
      unit: 'km',
    });
  } catch (error) {
    console.error('❌ Error calculating distance:', error.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * Haversine Formula - Calculate distance between two GPS coordinates
 * Returns distance in kilometers
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

export default router;
