import { isLocationMatch, getCityCoordinates, getDistanceBetweenCities } from './src/services/distanceService.js';

console.log('\n🧪 Testing Location Matching Logic\n');

// Test case 1: Customer pickup location matching
const customerPickup = "Indira Nagar, Palakonda";
const dealerPickupList = [
  "Palakonda, Parvathipuram Manyam",
  "Parvathipuram, Parvathipuram Manyam",
  "Seethampeta, Parvathipuram Manyam"
];

console.log(`Customer Pickup: "${customerPickup}"`);
console.log(`Dealer Pickups: ${JSON.stringify(dealerPickupList)}`);
console.log(`Match Result: ${isLocationMatch(customerPickup, dealerPickupList) ? '✅ MATCH' : '❌ NO MATCH'}\n`);

// Test case 2: Customer drop location matching
const customerDrop = "Palasa, Srikakulam";
const dealerDropList = [
  "Palakonda, Parvathipuram Manyam",
  "Parvathipuram, Parvathipuram Manyam",
  "Palasa, Srikakulam"
];

console.log(`Customer Drop: "${customerDrop}"`);
console.log(`Dealer Drops: ${JSON.stringify(dealerDropList)}`);
console.log(`Match Result: ${isLocationMatch(customerDrop, dealerDropList) ? '✅ MATCH' : '❌ NO MATCH'}\n`);

// Test case 3: Coordinates resolution
console.log('🗺️  Testing Coordinate Resolution:\n');

const testLocations = [
  "Indira Nagar, Palakonda",
  "Palakonda",
  "Palasa, Srikakulam",
  "Palasa",
  "Parvathipuram Manyam"
];

testLocations.forEach(loc => {
  const coord = getCityCoordinates(loc);
  console.log(`"${loc}": ${coord ? `✅ Found (${coord.lat}, ${coord.lng})` : '❌ Not Found'}`);
});

// Test case 4: Distance calculation
console.log('\n📏 Testing Distance Calculation:\n');

const distance1 = getDistanceBetweenCities("Indira Nagar, Palakonda", "Palasa, Srikakulam");
console.log(`Distance from "Indira Nagar, Palakonda" to "Palasa, Srikakulam": ${distance1} km`);

process.exit(0);
