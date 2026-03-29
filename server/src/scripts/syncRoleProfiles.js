import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import { syncRoleProfileFromUser } from '../services/roleProfileSync.js';

dotenv.config();

async function run() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment');
    }

    await connectDB(process.env.MONGODB_URI);

    const users = await User.find({ role: { $in: ['farmer', 'admin'] } });
    let synced = 0;

    for (const user of users) {
      await syncRoleProfileFromUser(user);
      synced += 1;
    }

    console.log(`✅ Role profile sync complete. Synced ${synced} users.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Role profile sync failed:', error.message);
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('❌ Failed to disconnect mongoose:', disconnectError.message);
    }
    process.exit(1);
  }
}

run();
