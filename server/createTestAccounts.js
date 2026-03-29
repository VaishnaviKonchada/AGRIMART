import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';
import TransportDealer from './src/models/TransportDealer.js';

mongoose.connect('mongodb://localhost:27017/agrimart-db')
  .then(async () => {
    console.log('Connected to database\n');
    
    // Create Vennela (Customer)
    console.log('Creating Vennela (Customer)...');
    const vennelaPassword = await bcrypt.hash('vennela123', 10);
    const vennela = await User.create({
      name: 'Vennela',
      email: 'vennela2901@gmail.com',
      passwordHash: vennelaPassword,
      role: 'customer',
      status: 'active',
      profile: {
        country: 'India',
        state: 'Andhra Pradesh',
        district: 'Parvathipuram Manyam',
        mandal: 'Seethampeta',
        doorNo: '12-34',
        pincode: '532284',
        locationText: 'Seethampeta, Parvathipuram Manyam',
        phone: '+91 98765 43210'
      }
    });
    console.log('✓ Vennela created:', vennela.email, '| Password: vennela123\n');
    
    // Create Raju (Dealer + User)
    console.log('Creating Raju (Dealer)...');
    const rajuPassword = await bcrypt.hash('raju123', 10);
    const raju = await User.create({
      name: 'Raju',
      email: 'konchadavaikunta@gmail.com',
      passwordHash: rajuPassword,
      role: 'customer', // Customer role so he can also buy crops
      status: 'active',
      profile: {
        country: 'India',
        state: 'Andhra Pradesh',
        district: 'Parvathipuram Manyam',
        mandal: 'Palakonda',
        doorNo: '123-A',
        pincode: '532440',
        locationText: 'Indira Nagar, Palakonda',
        phone: '+91 XXXXX XXXXX'
      }
    });
    console.log('✓ Raju user created:', raju.email, '| Password: raju123');
    
    // Create Raju's Transport Dealer Profile
    const rajuDealer = await TransportDealer.create({
      dealerId: raju._id,
      dealerName: 'Raju',
      dealerEmail: raju.email,
      dealerPhone: raju.profile.phone,
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
    console.log('✓ Raju transport dealer created with', rajuDealer.vehicles.length, 'vehicles\n');
    
    console.log('='.repeat(80));
    console.log('ACCOUNTS CREATED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log('\nLogin credentials:');
    console.log('1. Vennela (Customer):');
    console.log('   Email: vennela2901@gmail.com');
    console.log('   Password: vennela123');
    console.log('\n2. Raju (Dealer + Customer):');
    console.log('   Email: konchadavaikunta@gmail.com');
    console.log('   Password: raju123');
    console.log('\nYou can now:');
    console.log('- Login as Vennela → Buy crops → Request transport from Raju');
    console.log('- Login as Raju → View pending requests → Accept/Reject');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
