# AgrIMart - Complete Project Running Guide 🌾

## ⚡ Quick Start (5 minutes)

### Prerequisites
- Node.js v14+ installed
- MongoDB running locally or connection string ready
- Git (optional)

### Step 1: Setup Backend

```bash
# Navigate to server folder
cd server

# Install dependencies
npm install

# Create .env file with:
MONGODB_URI=mongodb://localhost:27017/agrimart
PORT=8081
JWT_SECRET=your_secret_key_here
NODE_ENV=development

# Seed sample data (optional)
node seedCrops.js

# Start server
npm start
```

Server will run on: **http://localhost:8081**

### Step 2: Setup Frontend

```bash
# Go back to root folder
cd ..

# Install dependencies
npm i

# Start React app
npm start
```

Frontend will run on: **http://localhost:3000**

---

## 📊 Project Architecture

```
agrimart-client/
├── public/                    # Static files
├── src/
│   ├── pages/                # Customer pages (Home, Cart, Orders, etc.)
│   ├── farmer/               # Farmer dashboard & features
│   ├── admin/                # Admin management panel
│   ├── transport-dealer/     # Transport dealer features
│   ├── components/           # Reusable components
│   ├── utils/                # API utilities, helpers
│   ├── styles/               # CSS files
│   └── App.js               # Main routing
├── server/
│   ├── src/
│   │   ├── config/          # Database config
│   │   ├── models/          # MongoDB schemas
│   │   ├── routes/          # API endpoints
│   │   ├── middlewares/     # Auth, validation
│   │   ├── services/        # Business logic
│   │   └── index.js         # Server startup
│   ├── data/                # CSV data for locations
│   ├── seedCrops.js         # Sample data seeder
│   └── package.json
└── package.json
```

---

## 🔐 User Roles & Credentials

### Test Accounts (after registration)

| Role | Email | Password | Features |
|------|-------|----------|----------|
| **Customer** | customer@test.com | password123 | Browse crops, place orders, track delivery |
| **Farmer** | farmer@test.com | password123 | Add crops, view orders, manage listings |
| **Admin** | admin@test.com | password123 | Manage users, view analytics, handle complaints |
| **Transport** | dealer@test.com | password123 | Register vehicles, manage deliveries, earn commissions |

### Registration Flow
1. Click "Register" on login page
2. Select your role (Customer/Farmer/Admin/Transport Dealer)
3. Fill in details
4. Click "Register" to create account
5. Login with your credentials

---

## 🛣️ Navigation Flow

### 👥 CUSTOMER Journey
```
Welcome Page 
    ↓
Login/Register 
    ↓
Home (Browse Crops) 
    ↓
Crop Details → Add to Cart 
    ↓
Cart (Review Items) 
    ↓
Checkout (Payment) 
    ↓
My Orders (Track Delivery) 
    ↓
Order Status Page
```

### 👨‍🌾 FARMER Journey
```
Welcome Page 
    ↓
Login/Register (Select Farmer) 
    ↓
Farmer Dashboard 
    ├── Add Crop → View My Crops
    ├── Orders Received
    ├── Earnings
    ├── Crop Chatbot (AI Helper)
    └── Account
```

### 🚚 TRANSPORT DEALER Journey
```
Welcome Page 
    ↓
Login/Register (Select Transport) 
    ↓
Transport Dashboard 
    ├── Service Area Setup (Required First!)
    ├── Add Vehicles
    ├── Active Trips/Orders
    ├── Earnings & Payments
    ├── Reviews/Ratings
    └── Account
```

### 👨‍💼 ADMIN Journey
```
Welcome Page 
    ↓
Login/Register (Admin Only) 
    ↓
Admin Dashboard 
    ├── Farmers Management
    ├── Customers Management
    ├── Transport Dealers Management
    ├── Orders Monitoring
    ├── Complaints & Support
    ├── Payments & Settlements
    ├── Reports & Analytics
    └── User Status Control
```

---

## 🔌 Backend API Endpoints

### Core Endpoints (All Roles)

```
AUTHENTICATION
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login user
POST   /api/auth/logout            - Logout user
POST   /api/auth/refresh-token     - Refresh JWT token

USER PROFILE
GET    /api/users/me               - Get current user profile
PUT    /api/users/profile         - Update user profile
GET    /api/users/:id             - Get user by ID

CROPS (Customer & Farmer)
GET    /api/crops                  - Get all active crops
GET    /api/crops/:id              - Get crop details
POST   /api/crops                  - Add crop (Farmer)
PUT    /api/crops/:id              - Update crop (Farmer)
DELETE /api/crops/:id              - Delete crop (Farmer)
GET    /api/farmer/crops          - Get farmer's crops

ORDERS (All Roles)
GET    /api/orders                 - List orders
GET    /api/orders/:id             - Get order details
POST   /api/orders                 - Create order
PATCH  /api/orders/:id/status     - Update order status
DELETE /api/orders/:id             - Cancel order

TRANSPORT
GET    /api/transport-dealers      - List all dealers
GET    /api/dealer/transport-profile - Get dealer profile
POST   /api/dealer/register-transport - Setup service area
GET    /api/dealer/vehicles        - Get dealer vehicles
POST   /api/dealer/vehicles        - Add vehicle

ADMIN
GET    /api/admin/dashboard        - Dashboard stats
GET    /api/admin/users            - Get users by role
PUT    /api/admin/users/:id/status - Block/Unblock user
GET    /api/admin/farmers-with-crops - Farmers + crops

LOCATIONS (Transport)
GET    /api/locations/districts    - Get all districts
GET    /api/locations/mandals/:district - Get mandals
```

---

## 🧪 Testing the Application

### Test Customer Crop Listing

```bash
# 1. Open browser DevTools (F12)
# 2. Go to Home page
# 3. Open Console tab
# 4. Check Network tab → filter by /api/crops
# 5. Should see crops loading with images
```

Expected Response:
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "cropName": "Tomato",
    "pricePerKg": 30,
    "quantity": 500,
    "category": "Vegetable",
    "status": "listed",
    "isActive": true,
    "images": ["https://..."],
    "farmerId": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Demo Farmer"
    }
  }
  // ... more crops
]
```

### Test Order Creation

```bash
# 1. Login as customer
# 2. Browse home page → select crop
# 3. Add to cart
# 4. Go to checkout
# 5. Click "Place Order"
# 6. Check console for order creation response
```

### Test Admin Features

```bash
# 1. Login as admin
# 2. Go to Admin Dashboard
# 3. Check Farmers Management → should list all farmers
# 4. Check Customers Management → should list all customers
# 5. Check Orders Monitoring → should list all orders
```

---

## 📱 UI Features (Unchanged)

All existing UI is preserved:
- ✅ Home page layout
- ✅ Crop cards with images
- ✅ Navigation bars (bottom nav for mobile)
- ✅ Cart interface
- ✅ Order tracking page
- ✅ Farmer dashboard layout
- ✅ Transport dealer features
- ✅ Admin management interface

### NEW: Backend Integration Features
- ✅ Real data from MongoDB
- ✅ Actual farmer crop listings
- ✅ Real order creation & tracking
- ✅ Actual user management
- ✅ Live notifications (ready for WebSocket)

---

## 🐛 Troubleshooting

### Issue: Crops not showing on home page

**Solution:**
```bash
# 1. Check backend is running
curl http://localhost:8081/api/health

# 2. Check crops in database
mongosh
> use agrimart
> db.crops.find()

# 3. Seed crops
cd server
node seedCrops.js

# 4. Check browser console for errors (F12)
```

### Issue: Login not working

**Solution:**
```bash
# 1. Make sure User table is created
mongosh > use agrimart > db.users.find()

# 2. Check accessToken in localStorage
# Console: localStorage.getItem("accessToken")

# 3. Reset and register fresh account

# 4. Check backend logs for auth errors
```

### Issue: "Cannot read property 'message' of undefined"

**Solution:**
- This means API response format doesn't match
- Check Network tab → /api/crops response
- Verify Crop model structure matches seed data

### Issue: CORS errors

**Solution:**
```bash
# Server already has CORS enabled
# Check server console for errors
# Restart both frontend and backend
```

---

## 🚀 Deployment (Optional)

### Deploy Backend to Heroku/Railway

```bash
# Create Procfile in server/
web: node src/index.js

# Deploy
git push heroku main

# Set environment variables
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_secret
```

### Deploy Frontend to Vercel/Netlify

```bash
# Build for production
npm run build

# Deploy the build folder
vercel --prod
```

---

## 📚 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  passwordHash: String,
  role: "customer" | "farmer" | "dealer" | "admin",
  status: "active" | "blocked",
  profile: {
    phone: String,
    location: String,
    district: String,
    mandal: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Crops Collection
```javascript
{
  _id: ObjectId,
  cropName: String,
  category: "Vegetable" | "Fruit" | "Grain" | "Spice",
  pricePerKg: Number,
  quantity: Number,
  availableQuantity: Number,
  images: [String],
  description: String,
  farmerId: ObjectId,
  isActive: Boolean,
  status: "listed" | "sold" | "hidden",
  createdAt: Date,
  updatedAt: Date
}
```

### Orders Collection
```javascript
{
  _id: ObjectId,
  orderId: String,
  customerId: ObjectId,
  farmerId: ObjectId,
  transportDealerId: ObjectId,
  items: [{
    cropId: ObjectId,
    cropName: String,
    quantity: Number,
    pricePerKg: Number
  }],
  summary: {
    itemsTotal: Number,
    transportFee: Number,
    total: Number
  },
  status: "Pending" | "Confirmed" | "In Transit" | "Delivered",
  createdAt: Date,
  updatedAt: Date
}
```

---

## ✨ Key Features Implemented

✅ **Customer Role**
- Browse all crops from database
- View crop details with farmer info
- Add to cart & checkout
- Place orders with real data
- Track order status
- View order history

✅ **Farmer Role**
- Add new crops to marketplace
- View crops they've added
- See orders for their crops
- Track earnings
- Manage crop listings

✅ **Transport Dealer Role**
- Register service areas (districts/mandals)
- Add vehicles
- Accept transport orders
- Track active trips
- Manage earnings

✅ **Admin Role**
- Dashboard with statistics
- Manage farmers, customers, dealers
- Monitor all orders
- Handle complaints
- View settlements & payments
- Generate reports

✅ **Backend Features**
- RESTful API with proper error handling
- JWT authentication with refresh tokens
- MongoDB data persistence
- CSV data import (districts, mandals)
- Role-based access control
- Order management system

---

## 📞 Support & Contact

### Debug Tips
1. Check browser console (F12) for client-side errors
2. Check server console for backend errors
3. Check Network tab for API response status
4. Use `mongosh` to inspect database
5. Clear browser cache & localStorage if stuck

### Common Commands

```bash
# Check if MongoDB is running
mongosh

# Check if backend is running
curl http://localhost:8081/api/health

# Check if frontend is running
curl http://localhost:3000

# View backend logs (in server folder)
npm start

# Reset database
mongosh > use agrimart > db.dropDatabase()
```

---

## 🎯 Next Steps

After running the project:
1. ✅ Register as different user roles
2. ✅ Test crop browsing as customer
3. ✅ Add crops as farmer
4. ✅ Create orders
5. ✅ Check admin dashboard
6. ✅ Monitor transport operations

---

**Last Updated:** February 24, 2025  
**Version:** 1.0 - Complete Backend Integration  
**Status:** ✅ Production Ready
