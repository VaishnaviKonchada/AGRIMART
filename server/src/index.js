import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import farmerRoutes from './routes/farmer.js';
import customerRoutes from './routes/customer.js';
import dealerRoutes from './routes/dealer.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/users.js';
import orderRoutes from './routes/orders.js';
import cropRoutes from './routes/crops.js';
import chatRoutes from './routes/chats.js';
import complaintRoutes from './routes/complaints.js';
import paymentRoutes from './routes/payments.js';
import transportDealersRoutes from './routes/transportDealers.js';
import locationsRoutes from './routes/locations.js';
import dealerOperationsRoutes from './routes/dealerOperations.js';
import diseaseRoutes from './routes/disease.js';
import translateRoutes from './routes/translate.js';
import cartRoutes from './routes/cart.js';
import { importDistricts, importMandals } from './services/csvImportService.js';

dotenv.config();

const app = express();
app.use(helmet());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*', credentials: true }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Authentication Routes
app.use('/api/auth', authRoutes);

// User Profile Routes
app.use('/api/users', userRoutes);

// Role-Based Routes
app.use('/api/farmer', farmerRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/dealer', dealerRoutes);
app.use('/api/admin', adminRoutes);

// Business Routes
console.log('[LOAD] About to register locations route...');
try {
  app.use('/api/orders', orderRoutes);
  console.log('[LOAD] ✅ Orders route registered');
  app.use('/api/crops', cropRoutes);
  console.log('[LOAD] ✅ Crops route registered');
  app.use('/api/chats', chatRoutes);
  console.log('[LOAD] ✅ Chats route registered');
  app.use('/api/complaints', complaintRoutes);
  console.log('[LOAD] ✅ Complaints route registered');
  app.use('/api/payments', paymentRoutes);
  console.log('[LOAD] ✅ Payments route registered');
  app.use('/api/transport-dealers', transportDealersRoutes);
  console.log('[LOAD] ✅ Transport dealers route registered');
  app.use('/api/locations', locationsRoutes);
  console.log('[LOAD] ✅ Locations route registered');
  app.use('/api/dealer', dealerOperationsRoutes);
  console.log('[LOAD] ✅ Dealer operations route registered');
  app.use('/api/disease', diseaseRoutes);
  console.log('[LOAD] ✅ Disease prediction route registered');
  app.use('/api/translate', translateRoutes);
  console.log('[LOAD] ✅ Translate proxy route registered');
  app.use('/api/cart', cartRoutes);
  console.log('[LOAD] ✅ Cart routes registered');
} catch (err) {
  console.error('[ERROR] Failed to register routes:', err.message, err.stack);
  process.exit(1);
}

// Always return JSON for unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl
  });
});

// Central error handler (JSON only)
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.message);
  res.status(err.status || 500).json({
    error: 'Server error'
  });
});

const port = process.env.PORT || 8080;

async function start() {
  try {
    if (process.env.MONGODB_URI) {
      try {
        await connectDB(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected');

        // Auto-import CSV data on startup
        console.log('\n📍 Checking and importing location data...');
        try {
          const districtResult = await importDistricts();
          console.log(`   ✅ ${districtResult}`);
        } catch (err) {
          console.error(`   ⚠️  Districts: ${err.message}`);
        }

        try {
          const mandalResult = await importMandals();
          console.log(`   ✅ ${mandalResult}`);
        } catch (err) {
          console.error(`   ⚠️  Mandals: ${err.message}`);
        }
        console.log('');
      } catch (dbErr) {
        console.error('❌ MongoDB connection failed:', dbErr.message);
        process.exit(1);
      }
    } else {
      console.error('❌ MONGODB_URI not set in .env file');
      process.exit(1);
    }
    
    console.log('[START] About to initialize Express server...');
    
    const server = app.listen(port, 'localhost', () => {
      console.log(`✅ API running on http://localhost:${port}`);
      console.log(`✅ CORS enabled for: ${process.env.CLIENT_ORIGIN || '*'}`);
    });
    
    // Handle server errors
    server.on('error', (err) => {
      console.error('❌ Server error:', err.message);
      process.exit(1);
    });
    
    server.on('listening', () => {
      console.log('📍 Server is now actively listening');
    });
    
    console.log('[END] Server initialization code completed');
  } catch (e) {
    console.error('❌ Failed to start server:', e.message, e.stack);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message, error.stack);
  process.exit(1);
});

start();
