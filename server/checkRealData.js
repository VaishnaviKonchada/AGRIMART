import mongoose from 'mongoose';
import Crop from './src/models/Crop.js';
import User from './src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkRealData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart');
    console.log('✅ Connected to MongoDB\n');

    // Find all farmers
    console.log('👨‍🌾 ALL FARMERS IN DATABASE:\n');
    const farmers = await User.find({ role: 'farmer' }).select('name email _id').lean();
    farmers.forEach((farmer, i) => {
      console.log(`${i + 1}. ${farmer.name} (${farmer.email})`);
      console.log(`   ID: ${farmer._id}\n`);
    });

    // Look for Shree Krishna specifically
    console.log('\n🔍 SEARCHING FOR "SHREE KRISHNA" FARMER:\n');
    const shreeKrishna = await User.findOne({ 
      name: { $regex: /shree krishna/i }
    }).lean();

    if (shreeKrishna) {
      console.log(`✅ Found: ${shreeKrishna.name} (${shreeKrishna.email})`);
      console.log(`   ID: ${shreeKrishna._id}\n`);

      // Get crops by this farmer
      const shreeKrishnaCrops = await Crop.find({ 
        farmerId: shreeKrishna._id 
      }).lean();

      console.log(`\n🌾 CROPS BY ${shreeKrishna.name.toUpperCase()}:\n`);
      if (shreeKrishnaCrops.length === 0) {
        console.log('   ❌ No crops found for this farmer');
      } else {
        shreeKrishnaCrops.forEach((crop, i) => {
          console.log(`${i + 1}. ${crop.cropName} - ₹${crop.pricePerKg}/kg`);
          console.log(`   Quantity: ${crop.availableQuantity || crop.quantity} kg`);
          console.log(`   Category: ${crop.category}`);
          console.log(`   Status: ${crop.status} | Active: ${crop.isActive}`);
          console.log(`   Created: ${crop.createdAt || 'N/A'}\n`);
        });
      }
    } else {
      console.log('❌ No farmer named "Shree Krishna" found in database');
    }

    // Show ALL crops with their farmers
    console.log('\n\n📊 ALL CROPS IN DATABASE:\n');
    const allCrops = await Crop.find({ isActive: true, status: 'listed' })
      .populate('farmerId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Total active crops: ${allCrops.length}\n`);
    allCrops.forEach((crop, i) => {
      const farmerName = crop.farmerId?.name || 'NO FARMER';
      console.log(`${i + 1}. ${crop.cropName} - ₹${crop.pricePerKg}/kg (${crop.availableQuantity || crop.quantity} kg)`);
      console.log(`   Farmer: ${farmerName}`);
      console.log(`   Status: ${crop.status} | Active: ${crop.isActive}\n`);
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

checkRealData();
