import mongoose from 'mongoose';
import Mandal from './src/models/Mandal.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart';

async function fixMandalCoordinates() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔧 Fixing incorrect mandal coordinates...\n');

    const corrections = [
      // Srikakulam district - verified from Google Maps
      { name: 'Palasa', district: 'Srikakulam', lat: 18.1633, lng: 84.2667 },
      { name: 'Palakonda', district: 'Parvathipuram Manyam', lat: 18.4167, lng: 84.0833 },
      { name: 'Seethampeta', district: 'Parvathipuram Manyam', lat: 18.2833, lng: 84.0667 },
      { name: 'Tekkali', district: 'Srikakulam', lat: 18.0833, lng: 84.2500 },
      { name: 'Parvathipuram', district: 'Parvathipuram Manyam', lat: 18.0667, lng: 83.9167 },
    ];

    for (const { name, district, lat, lng } of corrections) {
      const result = await Mandal.updateOne(
        {
          name: { $regex: `^${name}$`, $options: 'i' },
          district: { $regex: `^${district}$`, $options: 'i' }
        },
        {
          $set: {
            coordinates: { lat, lng }
          }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ ${name}, ${district}: (${lat}, ${lng})`);
      } else {
        console.log(`⚠️ ${name}, ${district}: NOT FOUND`);
      }
    }

    console.log('\n✅ Coordinate corrections complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixMandalCoordinates();
