import mongoose from 'mongoose';
import Mandal from './src/models/Mandal.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart';

async function checkMandals() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const mandalsToCheck = [
      { name: 'Palakonda', district: 'Parvathipuram Manyam' },
      { name: 'Seethampeta', district: 'Parvathipuram Manyam' },
      { name: 'Seethampeta', district: 'Palakonda' },
      { name: 'Palasa', district: 'Srikakulam' },
    ];

    for (const { name, district } of mandalsToCheck) {
      console.log(`🔍 Searching: ${name}, ${district}`);
      
      // Check by district
      const byDistrict = await Mandal.findOne({
        name: { $regex: `^${name}$`, $options: 'i' },
        district: { $regex: `^${district}$`, $options: 'i' },
      });
      
      // Check by region
      const byRegion = await Mandal.findOne({
        name: { $regex: `^${name}$`, $options: 'i' },
        region: { $regex: `^${district}$`, $options: 'i' },
      });
      
      // Check any match
      const anyMatch = await Mandal.findOne({
        name: { $regex: `^${name}$`, $options: 'i' },
      });

      if (byDistrict) {
        console.log(`   ✅ Found by district:`, {
          name: byDistrict.name,
          district: byDistrict.district,
          region: byDistrict.region,
          coordinates: byDistrict.coordinates
        });
      } else if (byRegion) {
        console.log(`   ✅ Found by region:`, {
          name: byRegion.name,
          district: byRegion.district,
          region: byRegion.region,
          coordinates: byRegion.coordinates
        });
      } else if (anyMatch) {
        console.log(`   ⚠️  Found (different district):`, {
          name: anyMatch.name,
          district: anyMatch.district,
          region: anyMatch.region,
          coordinates: anyMatch.coordinates
        });
      } else {
        console.log(`   ❌ Not found in database`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkMandals();
