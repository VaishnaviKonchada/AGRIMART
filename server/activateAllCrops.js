import mongoose from 'mongoose';
import Crop from './src/models/Crop.js';
import dotenv from 'dotenv';

dotenv.config();

async function activateAllCrops() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart');
    console.log('✅ Connected to MongoDB\n');

    // Update all crops to be active and listed
    const result = await Crop.updateMany(
      {},
      {
        $set: {
          isActive: true,
          status: 'listed'
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} crops to active & listed status`);

    // Verify
    const activeCrops = await Crop.countDocuments({ isActive: true, status: 'listed' });
    console.log(`✅ Total active & listed crops now: ${activeCrops}`);

    // Show sample
    const samples = await Crop.find({ isActive: true }).limit(10).select('cropName pricePerKg category');
    console.log('\n📋 Sample active crops:');
    samples.forEach((crop, i) => {
      console.log(`${i + 1}. ${crop.cropName} - ₹${crop.pricePerKg}/kg (${crop.category})`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Done!');
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

activateAllCrops();
