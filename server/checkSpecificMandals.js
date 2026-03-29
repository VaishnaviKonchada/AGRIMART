import mongoose from 'mongoose';
import Mandal from './src/models/Mandal.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart';

async function checkSpecificMandals() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    console.log('🔍 Checking specific mandal coordinates:\n');

    const testMandals = [
      { name: 'Palakonda', district: 'Parvathipuram Manyam' },
      { name: 'Palasa', district: 'Srikakulam' },
      { name: 'Seethampeta', district: 'Parvathipuram Manyam' },
    ];

    for (const { name, district } of testMandals) {
      const m = await Mandal.findOne({
        name: { $regex: `^${name}$`, $options: 'i' },
        district: { $regex: `^${district}$`, $options: 'i' }
      });

      if (m) {
        const hasCoords = m.coordinates?.lat && m.coordinates?.lng;
        console.log(`✅ ${name}, ${district}`);
        console.log(`   Coords: ${hasCoords ? `(${m.coordinates.lat}, ${m.coordinates.lng})` : '❌ NULL'}\n`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkSpecificMandals();
