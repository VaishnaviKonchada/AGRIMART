import mongoose from 'mongoose';
import TransportDealer from './src/models/TransportDealer.js';
import User from './src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function verifyDealer(email) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart');
    console.log('✅ Connected to MongoDB\n');

    //Find user by email
    const user = await User.findOne({ email: email });
    if (!user) {
      console.log(`❌ User not found with email: ${email}`);
      await mongoose.connection.close();
      process.exit(1);
    }

    // Find transport dealer
    const dealer = await TransportDealer.findOne({ dealerId: user._id });
    if (!dealer) {
      console.log(`❌ Transport dealer not found for user: ${email}`);
      await mongoose.connection.close();
      process.exit(1);
    }

    // Verify the dealer
    dealer.isVerified = true;
    await dealer.save();

    console.log(`✅ Dealer verified successfully!`);
    console.log(`   Name: ${dealer.dealerName}`);
    console.log(`   Email: ${email}`);
    console.log(`   Vehicles: ${dealer.vehicles.length}`);
    console.log(`   isVerified: ${dealer.isVerified ? '✅' : '❌'}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

// Get email from command line argument or use default
const dealerEmail = process.argv[2] || 'konchadavaikunta@gmail.com';
verifyDealer(dealerEmail);
