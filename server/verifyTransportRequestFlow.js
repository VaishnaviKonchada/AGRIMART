import mongoose from 'mongoose';
import dotenv from 'dotenv';
import TransportDealer from './src/models/TransportDealer.js';

dotenv.config();

const API_BASE = 'http://localhost:8081/api';

async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok || !data?.accessToken) {
    throw new Error(`Login failed for ${email}: ${data?.error || data?.message || res.status}`);
  }
  return data;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart');

  const dealerProfile = await TransportDealer.findOne({ dealerEmail: 'konchadavaikunta@gmail.com' });
  if (!dealerProfile) {
    throw new Error('Dealer profile not found');
  }

  const customerLogin = await login('vennela2901@gmail.com', 'vennela123');
  const dealerLogin = await login('konchadavaikunta@gmail.com', 'raju123');

  const requestPayload = {
    dealerId: dealerProfile.dealerId,
    pickupLocation: 'Palakonda, Parvathipuram Manyam',
    dropLocation: 'Seethampeta, Parvathipuram Manyam',
    quantity: 4,
    farmerName: 'Test Farmer',
    farmerLocation: 'Palakonda, Parvathipuram Manyam',
    quotedPrice: 120,
    vehicleType: 'BIKE',
    vehicleName: 'Royal Enfield Classic 350',
    licensePlate: 'AP39T1234',
  };

  const sendRes = await fetch(`${API_BASE}/transport-dealers/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerLogin.accessToken}`,
    },
    body: JSON.stringify(requestPayload),
  });
  const sendData = await sendRes.json();

  if (!sendRes.ok || !sendData.success) {
    throw new Error(`Request send failed: ${JSON.stringify(sendData)}`);
  }

  const pendingRes = await fetch(`${API_BASE}/transport-dealers/pending`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${dealerLogin.accessToken}`,
    },
  });
  const pendingData = await pendingRes.json();

  console.log('Send request result:', sendData);
  console.log('Pending count for dealer:', pendingData.count);
  console.log('Latest pending request id:', pendingData.requests?.[0]?._id || 'N/A');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Flow verification failed:', err.message);
  process.exit(1);
});
