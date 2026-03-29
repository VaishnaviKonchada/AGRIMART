import mongoose from 'mongoose';
import User from './src/models/User.js';

mongoose.connect('mongodb://localhost:27017/agrimart-db')
  .then(async () => {
    console.log('Connected to database');
    
    const users = await User.find({}).select('name email role status');
    console.log('\nAll users in database:');
    console.log('='.repeat(80));
    
    users.forEach(user => {
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Status: ${user.status}`);
      console.log('-'.repeat(80));
    });
    
    console.log(`\nTotal users: ${users.length}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
