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
// import { importDistricts, importMandals } from './services/csvImportService.js'; <--- Removed


dotenv.config();

const app = express();
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: false
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS configuration
const allowedOrigin = process.env.CLIENT_ORIGIN || '*';
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigin === '*') return callback(null, true);
    if (origin === allowedOrigin || /\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));

app.get('/', (req, res) => res.json({ 
  message: '🌾 AgriMart API is running', 
  status: 'active',
  documentation: 'Refer to AGRIMART_EXECUTION_PROCESS.md'
}));

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
  console.error('❌ Server error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    path: req.path
  });
});

// Database connection state
let isConnected = false;

async function connectToDatabase() {
  if (isConnected) return;
  if (!process.env.MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI is not set! The server might fail on DB operations.');
  }
  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is not set! All logins will FAIL on Vercel.');
  }
  try {
    await connectDB(process.env.MONGODB_URI);
    isConnected = true;
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
  }
}

// Middleware to ensure DB is connected
app.use(async (req, res, next) => {
  await connectToDatabase();
  next();
});

const port = process.env.PORT || 8080;

// Local development server
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`✅ API running locally on port ${port}`);
    // Run any local dev initialization if needed.
  });
}


// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message, error.stack);
});

// Connect DB and start server (for local dev / traditional hosting)
// start(); <--- removed


// Export for Vercel serverless functions
export default app;

