import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart-db');

  const updates = [
    { email: 'vennela2901@gmail.com', password: 'vennela123', role: 'customer' },
    { email: 'konchadavaikunta@gmail.com', password: 'raju123', role: 'dealer' },
  ];

  for (const item of updates) {
    const hash = await bcrypt.hash(item.password, 10);
    const user = await User.findOneAndUpdate(
      { email: item.email },
      { passwordHash: hash, role: item.role, status: 'active' },
      { new: true }
    );

    if (user) {
      console.log(`Updated ${item.email} | role=${user.role}`);
    } else {
      console.log(`User not found: ${item.email}`);
    }
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Failed to update passwords:', err.message);
  process.exit(1);
});
