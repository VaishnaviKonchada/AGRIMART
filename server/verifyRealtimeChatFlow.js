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
  if (!res.ok || !data?.accessToken) throw new Error(data?.message || data?.error || 'login failed');
  return data;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const dealerProfile = await TransportDealer.findOne({ dealerEmail: 'konchadavaikunta@gmail.com' });
  if (!dealerProfile) throw new Error('dealer profile not found');

  const customer = await login('vennela2901@gmail.com', 'vennela123');
  const dealer = await login('konchadavaikunta@gmail.com', 'raju123');

  const sendRes = await fetch(`${API_BASE}/transport-dealers/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customer.accessToken}`,
    },
    body: JSON.stringify({
      dealerId: dealerProfile.dealerId,
      pickupLocation: 'Palakonda, Parvathipuram Manyam',
      dropLocation: 'Seethampeta, Parvathipuram Manyam',
      quantity: 4,
      farmerName: 'Test Farmer',
      farmerLocation: 'Palakonda, Parvathipuram Manyam',
      quotedPrice: 150,
      vehicleType: 'BIKE',
    }),
  });
  const sendData = await sendRes.json();

  const acceptRes = await fetch(`${API_BASE}/transport-dealers/request/${sendData.requestId}/accept`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${dealer.accessToken}`,
    },
    body: JSON.stringify({}),
  });
  const acceptData = await acceptRes.json();

  const chatRes = await fetch(`${API_BASE}/chats/${acceptData.chatId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${customer.accessToken}` },
  });
  const chatData = await chatRes.json();

  const msgRes = await fetch(`${API_BASE}/chats/${acceptData.chatId}/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${dealer.accessToken}`,
    },
    body: JSON.stringify({ text: 'Dealer reply test message' }),
  });
  const msgData = await msgRes.json();

  console.log('Request sent:', sendData.success, sendData.requestId);
  console.log('Accepted with chat:', acceptData.success, acceptData.chatId);
  console.log('Chat fetched messages:', Array.isArray(chatData.messages) ? chatData.messages.length : -1);
  console.log('After dealer reply messages:', Array.isArray(msgData.messages) ? msgData.messages.length : -1);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Verification failed:', err.message);
  process.exit(1);
});
