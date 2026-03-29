import mongoose from 'mongoose';
import { calculateDistance } from './src/services/distanceService.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart';

async function testHaversine() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const palakonda = { lat: 18.4167, lng: 84.0833 };
    const seethampeta = { lat: 18.2833, lng: 84.0667 };
    
    const dist = calculateDistance(palakonda, seethampeta);
    
    console.log(`📍 Palakonda: (${palakonda.lat}, ${palakonda.lng})`);
    console.log(`📍 Seethampeta: (${seethampeta.lat}, ${seethampeta.lng})`);
    console.log(`\n📐 Haversine distance: ${Math.round(dist * 10) / 10} km`);
    console.log(`✅ Expected: ~14.7 km`);
    console.log(`Status: ${Math.round(dist * 10) / 10 <= 16 ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log('🛣️  OSRM is giving 34.3 km - this suggests:');
    console.log('1. These might not be the correct mandal coordinates');
    console.log('2. OSRM is taking a very indirect route');
    console.log('3. The nearby road network is different than expected');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testHaversine();
