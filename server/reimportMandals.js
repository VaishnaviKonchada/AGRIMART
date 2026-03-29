import mongoose from 'mongoose';
import { importMandals } from './src/services/csvImportService.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart';

async function reimportMandals() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    console.log('📥 Re-importing mandals with corrected region field...\n');

    const result = await importMandals(true); // force = true to delete existing
    console.log(`\n✅ ${result}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

reimportMandals();
