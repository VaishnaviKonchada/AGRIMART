import mongoose from 'mongoose';
import TransportDealer from './src/models/TransportDealer.js';

mongoose.connect('mongodb://localhost:27017/agrimart-db')
  .then(async () => {
    console.log('Connected to database');
    
    const dealers = await TransportDealer.find({}).populate('userId', 'name email role');
    console.log('\nAll transport dealers:');
    console.log('='.repeat(80));
    
    dealers.forEach(dealer => {
      console.log(`Dealer Name: ${dealer.userName}`);
      console.log(`Phone: ${dealer.phone}`);
      console.log(`User ID: ${dealer.userId}`);
      console.log(`Linked User: ${dealer.userId ? dealer.userId.name + ' (' + dealer.userId.email + ') | Role: ' + dealer.userId.role : 'NOT LINKED'}`);
      console.log(`Vehicles: ${dealer.vehicles.length}`);
      console.log('-'.repeat(80));
    });
    
    console.log(`\nTotal dealers: ${dealers.length}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
