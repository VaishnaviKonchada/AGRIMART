import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart';

async function checkMandalData() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    const Mandal = mongoose.model('Mandal', new mongoose.Schema({
      name: String,
      district: String,
      coordinates: { lat: Number, lng: Number }
    }), 'mandals');

    console.log('🔍 Checking actual mandal coordinates in database:\n');

    const mandals = [
      { name: 'Palakonda', district: 'Parvathipuram Manyam' },
      { name: 'Palasa', district: 'Srikakulam' },
      { name: 'Seethampeta', district: 'Parvathipuram Manyam' },
    ];

    for (const { name, district } of mandals) {
      const record = await Mandal.findOne({
        name: { $regex: `^${name}$`, $options: 'i' },
        district: { $regex: `^${district}$`, $options: 'i' }
      });

      if (record) {
        console.log(`${name}, ${district}:`);
        console.log(`  DB Coords: (${record.coordinates?.lat}, ${record.coordinates?.lng})`);
        console.log(`  Has data: ${record.coordinates?.lat ? '✅ YES' : '❌ NULL'}\n`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkMandalData();
