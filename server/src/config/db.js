import mongoose from 'mongoose';

export async function connectDB(uri) {
  console.log('🔄 Attempting MongoDB connection to:', uri);
  mongoose.set('strictQuery', true);
  
  // Add connection options
  const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority'
  };
  
  try {
    await mongoose.connect(uri, options);
    console.log('✅ MongoDB connection successful');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}
