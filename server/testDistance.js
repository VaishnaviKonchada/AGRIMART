import mongoose from 'mongoose';
import { getDistanceBetweenCities } from './src/services/distanceService.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart';

async function testDistances() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test the exact scenario from the user's screenshot
    console.log('🧪 Testing Distance Calculations:\n');

    const test1 = {
      pickup: 'Palakonda, Parvathipuram Manyam',
      drop: 'Seethampeta, Parvathipuram Manyam',
      expected: '~14.7 km (from Google Maps)'
    };

    console.log(`📍 Test 1: ${test1.pickup} → ${test1.drop}`);
    console.log(`   Expected: ${test1.expected}`);
    const distance1 = await getDistanceBetweenCities(test1.pickup, test1.drop);
    console.log(`   Calculated: ${distance1} km`);
    console.log(`   Status: ${distance1 > 0 && distance1 < 20 ? '✅ PASS' : '❌ FAIL (too high or invalid)'}\n`);

    // Additional test cases
    const test2 = {
      pickup: 'Palakonda, Parvathipuram Manyam',
      drop: 'Palasa, Srikakulam',
    };

    console.log(`📍 Test 2: ${test2.pickup} → ${test2.drop}`);
    const distance2 = await getDistanceBetweenCities(test2.pickup, test2.drop);
    console.log(`   Calculated: ${distance2} km`);
    console.log(`   Status: ${distance2 > 0 ? '✅ PASS' : '❌ FAIL'}\n`);

    const test3 = {
      pickup: 'Seethampeta, Palakonda',
      drop: 'Palakonda, Parvathipuram Manyam',
    };

    console.log(`📍 Test 3: ${test3.pickup} → ${test3.drop}`);
    const distance3 = await getDistanceBetweenCities(test3.pickup, test3.drop);
    console.log(`   Calculated: ${distance3} km`);
    console.log(`   Status: ${distance3 >= 0 && distance3 < 20 ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log('✅ Distance tests completed\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

testDistances();
