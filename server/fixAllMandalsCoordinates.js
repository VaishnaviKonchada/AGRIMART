import mongoose from 'mongoose';
import Mandal from './src/models/Mandal.js';

async function geocodeWithNominatim(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AgriMart/1.0' }
    });
    const data = await response.json();
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  } catch (error) {
    console.error(`Geocoding error for "${query}": ${error.message}`);
  }
  return null;
}

async function fixAllCoordinates() {
  await mongoose.connect('mongodb://localhost:27017/agrimart');
  
  const mandalsToFix = [
    { name: 'Palakonda', query: 'Palakonda, Parvathipuram Manyam, Andhra Pradesh, India' },
    { name: 'Palasa', query: 'Palasa, Srikakulam, Andhra Pradesh, India' },
    { name: 'Seethampeta', query: 'Seethampeta, Parvathipuram Manyam, Andhra Pradesh, India' },
    { name: 'Tekkali', query: 'Tekkali, Srikakulam, Andhra Pradesh, India' },
    { name: 'Parvathipuram', query: 'Parvathipuram, Parvathipuram Manyam, Andhra Pradesh, India' }
  ];
  
  console.log('🔍 Re-geocoding all key mandals...\n');
  
  for (const mandal of mandalsToFix) {
    const coords = await geocodeWithNominatim(mandal.query);
    if (coords) {
      await Mandal.updateOne(
        { name: new RegExp(`^${mandal.name}$`, 'i') },
        { coordinates: coords }
      );
      console.log(`✅ ${mandal.name}: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
    } else {
      console.log(`❌ ${mandal.name}: Geocoding failed`);
    }
    // Rate limit
    await new Promise(r => setTimeout(r, 1500));
  }
  
  console.log('\n📏 Testing distances with corrected coordinates...\n');
  
  // Test key routes
  const palakonda = await Mandal.findOne({ name: /^palakonda$/i }).lean();
  const palasa = await Mandal.findOne({ name: /^palasa$/i }).lean();
  const seethampeta = await Mandal.findOne({ name: /^seethampeta$/i }).lean();
  
  const testOSRM = async (from, to, label) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.coordinates.lng},${from.coordinates.lat};${to.coordinates.lng},${to.coordinates.lat}?overview=false`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.routes && data.routes.length > 0) {
      const distanceKm = (data.routes[0].distance / 1000).toFixed(1);
      console.log(`${label}: ${distanceKm} km`);
    }
  };
  
  if (palakonda && palasa) {
    await testOSRM(palakonda, palasa, 'Palakonda → Palasa');
  }
  if (palakonda && seethampeta) {
    await testOSRM(palakonda, seethampeta, 'Palakonda → Seethampeta');
  }
  if (palasa && seethampeta) {
    await testOSRM(palasa, seethampeta, 'Palasa → Seethampeta');
  }
  
  process.exit(0);
}

fixAllCoordinates().catch(err => {
  console.error(err);
  process.exit(1);
});
