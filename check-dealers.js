#!/usr/bin/env node

// Quick script to check dealer accounts in the database
import mongoose from 'mongoose';
import User from './server/src/models/User.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/agrimart';

async function checkDealers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const dealers = await User.find({ role: 'dealer' }).select('name email role');
    
    if (dealers.length === 0) {
      console.log('❌ NO DEALERS FOUND IN DATABASE');
      console.log('\n📝 To create a dealer account:');
      console.log('1. Go to http://localhost:3000/register');
      console.log('2. Select Role: "Transport Dealer"');
      console.log('3. Fill in the form with unique email (e.g., dealer.test@gmail.com)');
      console.log('4. Submit and login\n');
    } else {
      console.log(`✅ Found ${dealers.length} dealer account(s):\n`);
      dealers.forEach((dealer, i) => {
        console.log(`${i + 1}. ${dealer.name} (${dealer.email})`);
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDealers();
