import mongoose from 'mongoose';
import User from './src/models/User.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart-db');

  const updated = await User.findOneAndUpdate(
    { email: 'konchadavaikunta@gmail.com' },
    { role: 'dealer' },
    { new: true }
  );

  if (!updated) {
    console.log('User not found: konchadavaikunta@gmail.com');
  } else {
    console.log(`Updated role: ${updated.email} -> ${updated.role}`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Failed to update role:', err.message);
  process.exit(1);
});
