
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import User from './src/models/User.js';
import Admin from './src/models/Admin.js';

dotenv.config();

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
  }

  try {
    console.log('🔄 Connecting to Atlas...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB Atlas');

    const email = 'vaishnavikonchada2004@gmail.com';
    const password = 'admin123';
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (user) {
      console.log('ℹ️ User already exists, updating to Admin...');
      user.role = 'admin';
      user.roles = ['admin'];
      user.passwordHash = await bcrypt.hash(password, 10);
      await user.save();
    } else {
      console.log('📝 Creating new Admin user...');
      user = await User.create({
        name: 'Vaishnavi Konchada',
        email: email,
        passwordHash: await bcrypt.hash(password, 10),
        role: 'admin',
        roles: ['admin'],
        status: 'active',
        profile: {
          phone: '+91 00000 00000',
          country: 'India',
          state: 'Andhra Pradesh',
          district: 'Manyam',
          mandal: 'Palakonda',
          pincode: '532440',
          locationText: 'Admin Office'
        }
      });
    }

    // Also create/update Admin profile entry
    let adminProfile = await Admin.findOne({ email });
    if (!adminProfile) {
      await Admin.create({
        userId: user._id,
        name: user.name,
        email: user.email,
        profile: {
          status: 'active'
        }
      });
      console.log('✅ Admin profile created');
    }

    console.log('\n' + '='.repeat(40));
    console.log('🚀 ADMIN ACCOUNT CREATED SUCCESSFULLY!');
    console.log('='.repeat(40));
    console.log('Email:   ' + email);
    console.log('Password: ' + password);
    console.log('='.repeat(40));
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding admin:', err.message);
    process.exit(1);
  }
}

seed();
