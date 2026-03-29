import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';

async function run() {
  await mongoose.connect('mongodb://localhost:27017/agrimart');

  const updates = [
    { email: 'vennela2901@gmail.com', password: 'vennela123', role: 'customer' },
    { email: 'konchadavaikunta@gmail.com', password: 'raju123', role: 'dealer' },
  ];

  for (const item of updates) {
    const hash = await bcrypt.hash(item.password, 10);
    const updated = await User.findOneAndUpdate(
      { email: item.email },
      { passwordHash: hash, role: item.role, status: 'active' },
      { new: true }
    );
    if (updated) {
      console.log(`Updated ${updated.email} -> role=${updated.role}`);
    } else {
      console.log(`User not found: ${item.email}`);
    }
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
