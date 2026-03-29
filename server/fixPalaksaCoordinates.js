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

async function fixCoordinates() {
  await mongoose.connect('mongodb://localhost:27017/agrimart');
  
  console.log('🔍 Re-geocoding Palakonda and Palasa...\n');
  
  // Geocode Palakonda
  const palakondaCoords = await geocodeWithNominatim('Palakonda, Parvathipuram Manyam, Andhra Pradesh, India');
  console.log(`Palakonda: ${JSON.stringify(palakondaCoords)}`);
  
  if (palakondaCoords) {
    await Mandal.updateOne(
      { name: /^palakonda$/i },
      { coordinates: palakondaCoords }
    );
    console.log(`✅ Updated Palakonda coordinates`);
  }
  
  // Wait before next request (Nominatim rate limit)
  await new Promise(r => setTimeout(r, 1500));
  
  // Geocode Palasa
  const palasaCoords = await geocodeWithNominatim('Palasa, Srikakulam, Andhra Pradesh, India');
  console.log(`Palasa: ${JSON.stringify(palasaCoords)}`);
  
  if (palasaCoords) {
    await Mandal.updateOne(
      { name: /^palasa$/i },
      { coordinates: palasaCoords }
    );
    console.log(`✅ Updated Palasa coordinates`);
  }
  
  // Verify OSRM distance with new coordinates
  if (palakondaCoords && palasaCoords) {
    console.log(`\n📏 Testing OSRM with new coordinates...`);
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${palakondaCoords.lng},${palakondaCoords.lat};${palasaCoords.lng},${palasaCoords.lat}?overview=false`;
    const osrmResp = await fetch(osrmUrl);
    const osrmData = await osrmResp.json();
    if (osrmData.routes && osrmData.routes.length > 0) {
      const distanceKm = osrmData.routes[0].distance / 1000;
      console.log(`✅ OSRM distance with new coords: ${distanceKm.toFixed(1)} km`);
    }
  }
  
  process.exit(0);
}

fixCoordinates().catch(err => {
  console.error(err);
  process.exit(1);
});
