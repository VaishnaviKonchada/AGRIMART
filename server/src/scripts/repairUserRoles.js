import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User, { normalizeUserRoles } from '../models/User.js';
import { connectDB } from '../config/db.js';

dotenv.config();

async function repairUserRoles() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  await connectDB(uri);

  let scanned = 0;
  let repaired = 0;

  const cursor = User.find({}, { _id: 1, role: 1, roles: 1 }).cursor();

  for await (const user of cursor) {
    scanned += 1;
    const normalized = normalizeUserRoles(user);
    const existingRoles = Array.isArray(user.roles) ? user.roles : [];

    const roleChanged = user.role !== normalized.primaryRole;
    const rolesChanged = JSON.stringify(existingRoles) !== JSON.stringify(normalized.roles);

    if (roleChanged || rolesChanged) {
      await User.updateOne(
        { _id: user._id },
        { $set: { role: normalized.primaryRole, roles: normalized.roles } }
      );
      repaired += 1;
    }
  }

  console.log(`[repairUserRoles] scanned=${scanned}, repaired=${repaired}`);

  await mongoose.disconnect();
}

repairUserRoles()
  .then(() => {
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[repairUserRoles] failed:', err.message);
    try {
      await mongoose.disconnect();
    } catch (e) {
      // no-op
    }
    process.exit(1);
  });
