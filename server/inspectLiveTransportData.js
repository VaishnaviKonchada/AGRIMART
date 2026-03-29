import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import DealerRequest from './src/models/DealerRequest.js';
import TransportDealer from './src/models/TransportDealer.js';

dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart';
  await mongoose.connect(uri);

  const users = await User.find({ email: { $in: ['vennela2901@gmail.com', 'konchadavaikunta@gmail.com'] } })
    .select('name email role status');

  const dealers = await TransportDealer.find({ dealerEmail: 'konchadavaikunta@gmail.com' })
    .select('dealerId dealerName dealerEmail isActive isVerified');

  const requests = await DealerRequest.find({}).sort({ createdAt: -1 }).limit(10)
    .select('customerId dealerId dealerName status pickupLocation dropLocation quotedPrice expiresAt createdAt');

  console.log('DB URI:', uri);
  console.log('\nUsers:');
  users.forEach((u) => console.log(`- ${u.email} | role=${u.role} | status=${u.status}`));

  console.log('\nTransport Dealers:');
  dealers.forEach((d) => console.log(`- ${d.dealerEmail} | dealerId=${d.dealerId} | active=${d.isActive} verified=${d.isVerified}`));

  console.log('\nRecent Dealer Requests:');
  requests.forEach((r) => {
    console.log(`- ${r._id} | status=${r.status} | dealerId=${r.dealerId} | quoted=${r.quotedPrice} | created=${r.createdAt.toISOString()} | expires=${r.expiresAt ? r.expiresAt.toISOString() : 'N/A'}`);
  });

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Inspection failed:', err.message);
  process.exit(1);
});
