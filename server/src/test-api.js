import fetch from 'node-fetch';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8081/api';

async function testApi() {
  console.log('🧪 Testing API...');
  
  try {
    console.log('\n1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    console.log('Status:', healthResponse.status);
    const healthData = await healthResponse.json();
    console.log('Response:', healthData);
    
    console.log('\n2️⃣ Testing registration...');
    const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123!@',
        role: 'customer'
      })
    });
    console.log('Status:', registerResponse.status);
    const registerData = await registerResponse.json();
    console.log('Response:', registerData);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testApi();
