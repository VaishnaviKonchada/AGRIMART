import mongoose from 'mongoose';
import Crop from './src/models/Crop.js';
import User from './src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function clearSeedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart');
    console.log('✅ Connected to MongoDB\n');

    // Find John Farmer (seed data account)
    const johnFarmer = await User.findOne({ email: 'agri4mart@gmail.com' });
    
    if (!johnFarmer) {
      console.log('❌ John Farmer not found');
      await mongoose.connection.close();
      return;
    }

    console.log(`🗑️  Found seed account: ${johnFarmer.name} (${johnFarmer.email})`);
    console.log(`   ID: ${johnFarmer._id}\n`);

    // Count crops by John Farmer
    const seedCropsCount = await Crop.countDocuments({ farmerId: johnFarmer._id });
    console.log(`📊 Seed crops to delete: ${seedCropsCount}\n`);

    if (seedCropsCount === 0) {
      console.log('✅ No seed crops to delete');
      await mongoose.connection.close();
      return;
    }

    // Delete all crops by John Farmer
    const result = await Crop.deleteMany({ farmerId: johnFarmer._id });
    console.log(`✅ Deleted ${result.deletedCount} seed crops!\n`);

    // Show remaining crops
    const remainingCrops = await Crop.find()
      .populate('farmerId', 'name email')
      .lean();

    console.log(`📊 Remaining crops in database: ${remainingCrops.length}\n`);
    if (remainingCrops.length > 0) {
      console.log('Crops by real farmers:\n');
      remainingCrops.forEach((crop, i) => {
        console.log(`${i + 1}. ${crop.cropName} - ₹${crop.pricePerKg}/kg`);
        console.log(`   Farmer: ${crop.farmerId?.name || 'Unknown'}`);
        console.log(`   Quantity: ${crop.availableQuantity || crop.quantity} kg\n`);
      });
    } else {
      console.log('✅ Database is now clean - only farmer-added crops will show!');
      console.log('\n💡 Next step: Login as any farmer and add crops via "Add Crop" page');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

clearSeedData();
