import mongoose from 'mongoose';
import Mandal from './src/models/Mandal.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart';

async function verifyPalasaCoordinates() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    // Get Palasa coordinates from DB
    const palasa = await Mandal.findOne({
      name: { $regex: '^Palasa$', $options: 'i' },
      district: { $regex: '^Srikakulam$', $options: 'i' }
    });

    console.log('Palasa, Srikakulam in database:');
    if (palasa) {
      console.log(`  Coordinates: (${palasa.coordinates.lat}, ${palasa.coordinates.lng})`);
      console.log(`  Expected (from Google Maps): (18.1633, 84.2667)`);
      console.log(`  Match: ${Math.abs(palasa.coordinates.lat - 18.1633) < 0.5 ? '✅ YES' : '❌ NO (wrong location found by Nominatim)'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

verifyPalasaCoordinates();
