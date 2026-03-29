import mongoose from 'mongoose';
import Crop from './src/models/Crop.js';
import User from './src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkFarmerData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart');
    console.log('✅ Connected to MongoDB\n');

    // Get crops with populated farmer data
    const crops = await Crop.find({ isActive: true, status: 'listed' })
      .populate('farmerId', 'name email')
      .limit(5)
      .lean();

    console.log('📊 Sample crops with farmer data:\n');
    crops.forEach((crop, i) => {
      const farmerName = crop.farmerId?.name || 'NO FARMER';
      const farmerEmail = crop.farmerId?.email || 'NO EMAIL';
      console.log(`${i + 1}. ${crop.cropName} - ₹${crop.pricePerKg}/kg`);
      console.log(`   Farmer: ${farmerName} (${farmerEmail})`);
      console.log(`   Available: ${crop.availableQuantity || crop.quantity} kg\n`);
    });

    // Count crops without farmers
    const cropsWithoutFarmers = await Crop.countDocuments({ 
      farmerId: null,
      isActive: true,
      status: 'listed'
    });

    if (cropsWithoutFarmers > 0) {
      console.log(`⚠️  Found ${cropsWithoutFarmers} crops without farmers!`);
    } else {
      console.log('✅ All crops have farmer assignments!');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

checkFarmerData();
