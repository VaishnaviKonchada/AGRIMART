import mongoose from 'mongoose';
import Crop from './src/models/Crop.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkCrops() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart');
    console.log('✅ Connected to MongoDB\n');

    const totalCrops = await Crop.countDocuments();
    const activeCrops = await Crop.countDocuments({ isActive: true, status: 'listed' });
    const inactiveCrops = await Crop.countDocuments({ $or: [{ isActive: false }, { status: { $ne: 'listed' } }] });

    console.log('📊 Database Status:');
    console.log('Total crops:', totalCrops);
    console.log('Active & listed:', activeCrops);
    console.log('Inactive or not listed:', inactiveCrops);

    console.log('\n📋 Sample crops:');
    const samples = await Crop.find().limit(10).populate('farmerId', 'name');
    samples.forEach((crop, i) => {
      console.log(`${i + 1}. ${crop.cropName} - ${crop.pricePerKg}/kg - Active:${crop.isActive} Status:${crop.status} Farmer:${crop.farmerId?.name || 'None'}`);
    });

    console.log('\n🔍 Active crops:');
    const active = await Crop.find({isActive: true, status: 'listed'}).populate('farmerId', 'name');
    active.forEach((crop, i) => {
      console.log(`${i + 1}. ${crop.cropName} - ${crop.pricePerKg}/kg - Farmer:${crop.farmerId?.name || 'None'}`);
    });

    await mongoose.connection.close();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

checkCrops();
