import mongoose from 'mongoose';
import { getCityCoordinates } from './src/services/distanceService.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart';

async function checkCoordinates() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const testLocations = [
      'Palakonda, Parvathipuram Manyam',
      'Palakonda',
      'palakonda',
      'Seethampeta, Parvathipuram Manyam',
      'Seethampeta',
      'seethampeta',
    ];

    console.log('🗺️  Testing coordinate resolution:\n');
    
    testLocations.forEach(loc => {
      const coord = getCityCoordinates(loc);
      console.log(`"${loc}"`);
      console.log(`  Result: ${coord ? `(${coord.lat}, ${coord.lng})` : '❌ NOT FOUND'}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkCoordinates();
