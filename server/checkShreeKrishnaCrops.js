import mongoose from 'mongoose';
import Crop from './src/models/Crop.js';
import User from './src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkAllCrops() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart');
    console.log('✅ Connected to MongoDB\n');

    // Find Shree Krishna
    const shreeKrishna = await User.findOne({ 
      name: { $regex: /shree krishna/i }
    }).lean();

    if (!shreeKrishna) {
      console.log('❌ Shree Krishna not found');
      await mongoose.connection.close();
      return;
    }

    console.log(`🔍 Checking ALL crops (including inactive/draft) for: ${shreeKrishna.name}\n`);

    // Get ALL crops by this farmer (including inactive, draft, etc.)
    const allCrops = await Crop.find({ 
      farmerId: shreeKrishna._id 
    }).lean();

    console.log(`Total crops by Shree Krishna: ${allCrops.length}\n`);

    if (allCrops.length === 0) {
      console.log('❌ Shree Krishna has NOT added any crops yet!');
      console.log('\n💡 SOLUTION: Login as Shree Krishna and add crops via "Add Crop" page');
      console.log('\n📧 Login credentials:');
      console.log(`   Email: ${shreeKrishna.email}`);
      console.log(`   Role: farmer`);
    } else {
      allCrops.forEach((crop, i) => {
        console.log(`${i + 1}. ${crop.cropName}`);
        console.log(`   Price: ₹${crop.pricePerKg}/kg`);
        console.log(`   Quantity: ${crop.availableQuantity || crop.quantity} kg`);
        console.log(`   Status: ${crop.status}`);
        console.log(`   Active: ${crop.isActive}`);
        console.log(`   Created: ${crop.createdAt}\n`);
      });
    }

    // Also check if there's an Apple crop with 20kg
    console.log('\n\n🍎 Searching for Apple crops with ~20kg:\n');
    const appleCrops = await Crop.find({ 
      cropName: { $regex: /apple/i },
      $or: [
        { availableQuantity: { $gte: 15, $lte: 25 } },
        { quantity: { $gte: 15, $lte: 25 } }
      ]
    }).populate('farmerId', 'name email').lean();

    if (appleCrops.length === 0) {
      console.log('❌ No Apple crop with ~20kg found in database');
    } else {
      appleCrops.forEach(crop => {
        console.log(`✅ Found: ${crop.cropName}`);
        console.log(`   Farmer: ${crop.farmerId?.name || 'Unknown'}`);
        console.log(`   Quantity: ${crop.availableQuantity || crop.quantity} kg`);
        console.log(`   Price: ₹${crop.pricePerKg}/kg`);
        console.log(`   Status: ${crop.status} | Active: ${crop.isActive}\n`);
      });
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

checkAllCrops();
