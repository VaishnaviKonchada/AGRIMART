import mongoose from 'mongoose';
import Mandal from './src/models/Mandal.js';

mongoose.connect('mongodb://localhost:27017/agrimart').then(async () => {
  console.log('Checking Palakonda and Seethampeta coordinates...\n');
  
  const mandals = await Mandal.find({ 
    name: { $in: ['Palakonda', 'Seethampeta'] } 
  }).lean();
  
  mandals.forEach(m => {
    console.log(`${m.name} (${m.district}, ${m.region}):`);
    console.log(`  Coordinates: ${m.coordinates ? `${m.coordinates.lat}, ${m.coordinates.lng}` : 'NULL'}`);
    console.log('');
  });
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
