import mongoose from 'mongoose';
import User from './src/models/User.js';
import TransportDealer from './src/models/TransportDealer.js';

mongoose.connect('mongodb://localhost:27017/agrimart-db')
  .then(async () => {
    console.log('Connected to database\n');
    
    // Find Raju user
    const raju = await User.findOne({ email: 'konchadavaikunta@gmail.com' });
    if (!raju) {
      console.log('❌ Raju user not found! Please create user account first.');
      process.exit(1);
    }
    
    console.log('✓ Found Raju user:', raju.email);
    
    // Check if dealer already exists
    const existing = await TransportDealer.findOne({ dealerId: raju._id });
    if (existing) {
      console.log('✓ Raju dealer profile already exists!');
      process.exit(0);
    }
    
    // Create Raju's Transport Dealer Profile
    console.log('\nCreating Raju transport dealer profile...');
    const rajuDealer = await TransportDealer.create({
      dealerId: raju._id,
      dealerName: 'Raju',
      dealerEmail: raju.email,
      dealerPhone: raju.profile.phone || '+91 98765 12345',
      address: 'Indira Nagar, Palakonda',
      city: 'Palakonda',
      state: 'Andhra Pradesh',
      pincode: '532440',
      isVerified: true,
      isActive: true,
      vehicles: [
        {
          vehicleName: 'Royal Enfield Classic 350',
          vehicleType: 'BIKE',
          licensePlate: 'AP39T1234',
          capacity: 5,
          year: 2023,
          perKmPrice: 8,
          status: 'Active',
          isActive: true,
          isVisibleToCustomers: true,
          pickupLocations: ['Palakonda', 'Seethampeta', 'Palasa', 'Tekkali'],
          dropLocations: ['Palakonda', 'Seethampeta', 'Palasa', 'Tekkali', 'Parvathipuram']
        },
        {
          vehicleName: 'Bajaj Auto',
          vehicleType: 'AUTO',
          licensePlate: 'AP39A5678',
          capacity: 20,
          year: 2022,
          perKmPrice: 15,
          status: 'Active',
          isActive: true,
          isVisibleToCustomers: true,
          pickupLocations: ['Palakonda', 'Seethampeta', 'Palasa'],
          dropLocations: ['Palakonda', 'Seethampeta', 'Palasa', 'Parvathipuram']
        },
        {
          vehicleName: 'Tata Ace',
          vehicleType: 'TRUCK',
          licensePlate: 'AP39T9012',
          capacity: 100,
          year: 2021,
          perKmPrice: 28,
          status: 'Active',
          isActive: true,
          isVisibleToCustomers: true,
          pickupLocations: ['Palakonda', 'Seethampeta'],
          dropLocations: ['Palakonda', 'Seethampeta', 'Palasa', 'Parvathipuram', 'Vizianagaram']
        }
      ]
    });
    
    console.log('✓ Raju transport dealer created with', rajuDealer.vehicles.length, 'vehicles!');
    console.log('\n' + '='.repeat(80));
    console.log('SUCCESS! Raju is now a transport dealer.');
    console.log('='.repeat(80));
    console.log('\nVehicles registered:');
    rajuDealer.vehicles.forEach((v, i) => {
      console.log(`  ${i + 1}. ${v.vehicleType} - ${v.vehicleName} (${v.licensePlate})`);
      console.log(`     Capacity: ${v.capacity} kg | Rate: ₹${v.perKmPrice}/km`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
