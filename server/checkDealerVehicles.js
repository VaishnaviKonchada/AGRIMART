import mongoose from 'mongoose';
import TransportDealer from './src/models/TransportDealer.js';
import User from './src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkDealerVehicles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart');
    console.log('✅ Connected to MongoDB\n');

    // Get all transport dealers with vehicles
    const dealers = await TransportDealer.find({ isActive: true })
      .populate('dealerId', 'name email')
      .lean();

    if (dealers.length === 0) {
      console.log('❌ No transport dealers found!');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`📊 Found ${dealers.length} transport dealer(s):\n`);

    dealers.forEach((dealer, i) => {
      console.log(`${i + 1}. ${dealer.dealerName} (${dealer.dealerId?.email || 'NO EMAIL'})`);
      console.log(`   Verified: ${dealer.isVerified ? '✅' : '❌'}`);
      console.log(`   Vehicles: ${dealer.vehicles.length}`);
      
      dealer.vehicles.forEach((vehicle, j) => {
        console.log(`\n   Vehicle ${j + 1}: ${vehicle.vehicleType} - ${vehicle.licensePlate}`);
        console.log(`   - Capacity: ${vehicle.capacity} kg`);
        console.log(`   - Active: ${vehicle.isActive ? '✅' : '❌'}`);
        console.log(`   - Visible to Customers: ${vehicle.isVisibleToCustomers ? '✅ YES' : '❌ NO'}`);
        console.log(`   - Pickup Locations (${vehicle.pickupLocations?.length || 0}):`);
        if (vehicle.pickupLocations?.length > 0) {
          vehicle.pickupLocations.slice(0, 5).forEach(loc => {
            console.log(`     📍 ${loc}`);
          });
        }
        console.log(`   - Drop Locations (${vehicle.dropLocations?.length || 0}):`);
        if (vehicle.dropLocations?.length > 0) {
          vehicle.dropLocations.slice(0, 5).forEach(loc => {
            console.log(`     🎯 ${loc}`);
          });
        }
      });
      console.log('\n---\n');
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

checkDealerVehicles();
