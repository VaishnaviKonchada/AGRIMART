import mongoose from 'mongoose';
import Mandal from './src/models/Mandal.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart';

const geocodeCache = new Map();

async function geocodeWithNominatim(query) {
  if (!query) return null;

  const cacheKey = query.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AgriMart/1.0 (support@agrimart.local)' },
    });

    if (!response.ok) {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const results = await response.json();
    const top = Array.isArray(results) ? results[0] : null;
    const lat = top ? Number(top.lat) : NaN;
    const lng = top ? Number(top.lon) : NaN;
    const coordinates = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

    geocodeCache.set(cacheKey, coordinates);
    return coordinates;
  } catch (error) {
    console.warn(`⚠️ Geocoding error for "${query}": ${error.message}`);
    geocodeCache.set(cacheKey, null);
    return null;
  }
}

async function fillMandalCoordinates() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all mandals with NULL coordinates
    const mandalsWithoutCoords = await Mandal.find({
      $or: [
        { 'coordinates.lat': { $exists: false } },
        { 'coordinates.lat': null },
        { 'coordinates.lng': null }
      ]
    }).limit(681); // Limit to prevent too many API calls

    console.log(`📍 Found ${mandalsWithoutCoords.length} mandals missing coordinates\n`);
    console.log('🌐 Geocoding from Nominatim (this will take a minute...):\n');

    let updated = 0;
    let failed = 0;

    for (let i = 0; i < mandalsWithoutCoords.length; i++) {
      const mandal = mandalsWithoutCoords[i];
      const query = `${mandal.name}, ${mandal.district}, Andhra Pradesh, India`;
      
      const coords = await geocodeWithNominatim(query);
      
      if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
        mandal.coordinates = { lat: coords.lat, lng: coords.lng };
        await mandal.save();
        updated++;
        console.log(`✅ ${updated}. ${mandal.name}, ${mandal.district}: (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
      } else {
        failed++;
        console.log(`⚠️ ${updated + failed}. ${mandal.name}, ${mandal.district}: NO RESULT`);
      }
      
      // Rate limiting: 1 request per 300ms to avoid being blocked
      if ((i + 1) % 10 === 0) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    console.log(`\n✅ Geocoding complete:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⚠️  Failed: ${failed}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

fillMandalCoordinates();
