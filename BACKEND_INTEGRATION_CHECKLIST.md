# Backend Integration Checklist ✅

## Overview
This document tracks the complete backend + MongoDB integration for all 4 roles:
1. **Customer** (Marketplace User)
2. **Farmer** (Crop Seller)
3. **Transport Dealer** (Logistics Provider)
4. **Admin** (Platform Administrator)

---

## Fixed Issues

### 1. API_URL References ✅
**Problem:** Multiple files were using undefined `API_URL` variable instead of the API utility function.

**Files Fixed:**
- `src/admin/AdminDashboard.js`
- `src/admin/TransportDealersManagement.js`
- `src/admin/FarmersManagement.js`
- `src/admin/CustomersManagement.js`
- `src/admin/ComplaintsSupport.js`
- `src/admin/Reports.js`
- `src/admin/OrdersMonitoring.js`
- `src/admin/PaymentsSettlements.js`
- `src/pages/Account.js`
- `src/pages/DeliveryStatus.js`
- `src/pages/OrderHistory.js`
- `src/transport-dealer/TransportDealerActiveTrips.js`

**Solution:** 
- Replaced all `fetch(\`${API_URL}...\`)` with proper `apiGet()`, `apiPost()`, `apiPut()`, `apiPatch()`, `apiDelete()` calls
- These utilities are defined in `src/utils/api.js` and handle authentication + error handling automatically

### 2. API Utility Functions ✅
All API calls now use the centralized utility in `src/utils/api.js`:

```javascript
// GET endpoint
const data = await apiGet("crops");

// POST endpoint
const result = await apiPost("orders", { items: [...] });

// PUT endpoint
const updated = await apiPut("users/profile", { name: "..." });

// PATCH endpoint
const patched = await apiPatch("orders/123/status", { status: "Delivered" });

// DELETE endpoint
await apiDelete("orders/123");
```

---

## Role-Based Pages Integration Status

### 🛒 CUSTOMER ROLE (Customer Pages)
Location: `src/pages/`

| Feature | File | Backend | Status |
|---------|------|---------|--------|
| **Marketplace - View All Crops** | `Home.js` | `GET /api/crops` | ✅ Fixed |
| **Crop Details** | `CropDetails.js` | `GET /api/crops/:id` | ✅ Ready |
| **Cart** | `Cart.js` | Local state | ✅ Ready |
| **Checkout & Payment** | `Payment.js` | `POST /api/orders` | ✅ Ready |
| **Order History** | `OrderHistory.js` | `GET /api/orders` | ✅ Fixed |
| **Order Tracking** | `DeliveryStatus.js` | `GET /api/orders` | ✅ Fixed |
| **Account Profile** | `Account.js` | `GET/PUT /api/users` | ✅ Fixed |
| **Support Chat** | `SupportChat.js` | `POST /api/chats` | ✅ Ready |

### 👨‍🌾 FARMER ROLE (Farmer Module)
Location: `src/farmer/`

| Feature | File | Backend | Status |
|---------|------|---------|--------|
| **Dashboard** | `FarmerDashboard.js` | `GET /api/orders/farmer/:id` | ✅ Ready |
| **Add New Crop** | `AddCrop.js` | `POST /api/crops` | ✅ Ready |
| **My Crops** | `MyCrops.js` | `GET /api/farmer/crops` | ✅ Ready |
| **Orders Received** | `FarmerOrders.js` | `GET /api/orders/farmer/:id` | ✅ Ready |
| **Account** | `FarmerAccount.js` | `GET/PUT /api/users` | ✅ Ready |
| **Crop Chatbot** | `CropChatbot.js` | Local AI | ✅ Ready |

### 🚚 TRANSPORT DEALER ROLE (Transport Module)
Location: `src/transport-dealer/`

| Feature | File | Backend | Status |
|---------|------|---------|--------|
| **Dashboard** | `TransportDealerDashboard.js` | `GET /api/orders` | ✅ Fixed |
| **Service Area Setup** | `TransportDealerServiceArea.js` | `POST /api/dealer/register-transport` | ✅ Ready |
| **Vehicles Management** | `TransportDealerVehicles.js` | `GET/POST /api/dealer/vehicles` | ✅ Ready |
| **Active Trips** | `TransportDealerActiveTrips.js` | `GET/PATCH /api/orders` | ✅ Fixed |
| **Transport Requests** | `TransportDealerRequests.js` | `GET /api/orders` | ✅ Ready |
| **Earnings** | `TransportDealerEarnings.js` | `GET /api/payments` | ✅ Ready |
| **Account** | `TransportDealerAccount.js` | `GET/PUT /api/users` | ✅ Ready |
| **Reviews/Ratings** | `TransportDealerReviews.js` | `GET /api/reviews` | ✅ Ready |

### 👨‍💼 ADMIN ROLE (Admin Module)
Location: `src/admin/`

| Feature | File | Backend | Status |
|---------|------|---------|--------|
| **Dashboard** | `AdminDashboard.js` | `GET /api/admin/dashboard` | ✅ Fixed |
| **Farmers Management** | `FarmersManagement.js` | `GET /api/admin/farmers-with-crops` | ✅ Fixed |
| **Customers Management** | `CustomersManagement.js` | `GET /api/admin/users?role=customer` | ✅ Fixed |
| **Transport Dealers Mgmt** | `TransportDealersManagement.js` | `GET /api/admin/users?role=dealer` | ✅ Fixed |
| **Orders Monitoring** | `OrdersMonitoring.js` | `GET /api/orders` | ✅ Fixed |
| **Complaints Support** | `ComplaintsSupport.js` | `GET /api/complaints` | ✅ Fixed |
| **Payments & Settlements** | `PaymentsSettlements.js` | `GET /api/orders` | ✅ Fixed |
| **Reports** | `Reports.js` | `GET /api/orders`, `/api/admin/users` | ✅ Fixed |

---

## Backend API Endpoints Summary

### Authentication
```
POST   /api/auth/register         - User registration
POST   /api/auth/login            - User login
POST   /api/auth/logout           - User logout
POST   /api/auth/refresh-token    - Refresh accessToken
```

### Users & Profiles
```
GET    /api/users/me              - Get current user profile
PUT    /api/users/profile         - Update user profile
GET    /api/users/:id             - Get user by ID
```

### Crops (Customer, Farmer)
```
GET    /api/crops                 - List all active crops (paginated)
GET    /api/crops/:id             - Get single crop details
POST   /api/crops                 - Add new crop (Farmer)
PUT    /api/crops/:id             - Update crop (Farmer)
DELETE /api/crops/:id             - Delete crop (Farmer)
GET    /api/farmer/crops          - Get farmer's crops
```

### Orders (All Roles)
```
GET    /api/orders                - List all orders
GET    /api/orders/:id            - Get single order
POST   /api/orders                - Create new order (Customer)
PATCH  /api/orders/:id/status     - Update order status
DELETE /api/orders/:id            - Cancel order
GET    /api/orders/farmer/:id     - Get farmer's orders
GET    /api/orders/customer/:id   - Get customer's orders
GET    /api/orders/transport/:id  - Get transport dealer's orders
```

### Transport Dealers
```
GET    /api/transport-dealers             - List all dealers
GET    /api/transport-dealers/:id         - Get dealer details
POST   /api/dealer/register-transport     - Register service area
GET    /api/dealer/transport-profile      - Get transport profile
GET    /api/dealer/vehicles               - Get dealer's vehicles
POST   /api/dealer/vehicles               - Add vehicle
```

### Admin
```
GET    /api/admin/dashboard               - Dashboard stats
GET    /api/admin/users?role=farmer       - Get all farmers
GET    /api/admin/users?role=customer     - Get all customers
GET    /api/admin/users?role=dealer       - Get all dealers
PUT    /api/admin/users/:id/status        - Update user status
GET    /api/admin/farmers-with-crops      - Get farmers + crop count
```

### Locations
```
GET    /api/locations/districts           - List all districts
GET    /api/locations/mandals/:district   - Get mandals by district
```

### Other
```
GET    /api/complaints              - Get complaints
POST   /api/complaints              - Create complaint
GET    /api/payments                - Get payment records
GET    /api/chats                   - Get messages
POST   /api/chats                   - Send message
```

---

## MongoDB Collections

### User Collection
```
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String (hashed),
  role: "customer" | "farmer" | "dealer" | "admin",
  status: "active" | "blocked",
  phone: String,
  location: String,
  district: String,
  mandal: String,
  doorNo: String,
  pincode: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Crop Collection
```
{
  _id: ObjectId,
  cropName: String,
  category: "Vegetable" | "Fruit" | "Grain" | "Spice" | "Herb" | "Other",
  pricePerKg: Number,
  quantity: Number,
  availableQuantity: Number,
  images: [String],
  description: String,
  farmerId: ObjectId (ref: User),
  farmerName: String,
  isActive: Boolean,
  status: "listed" | "sold" | "hidden",
  createdAt: Date,
  updatedAt: Date
}
```

### Order Collection
```
{
  _id: ObjectId,
  orderId: String (unique),
  customerId: ObjectId (ref: User),
  farmerId: ObjectId (ref: User),
  transportDealerId: ObjectId (ref: User),
  items: [{
    cropId: ObjectId,
    cropName: String,
    pricePerKg: Number,
    quantity: Number
  }],
  summary: {
    itemsTotal: Number,
    transportFee: Number,
    platformFee: Number,
    total: Number
  },
  status: "Pending" | "Confirmed" | "In Transit" | "Delivered" | "Cancelled",
  pickupLocation: String,
  dropLocation: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## How to Run the Complete Project

### 1. Start MongoDB
```bash
# Windows
mongod

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongodb
```

### 2. Start Backend Server
```bash
cd server
npm install
npm start  # or npm run dev
```

Backend runs on: `http://localhost:8081`

### 3. Start Frontend
```bash
cd ..  # Go back to root
npm install
npm start
```

Frontend runs on: `http://localhost:3000`

### 4. Backend Auto-Imports CSV Data
On server startup, it automatically:
- Imports districts from `server/data/AP_Regions_Districts.csv`
- Imports mandals from `server/data/AP_Mandals_Full_681.csv`

Check console for: `✅ Districts imported` and `✅ Mandals imported`

---

## Testing the Integration

### Test Customer Crop Listing
```javascript
// In browser console (Home.js)
// Should fetch and display multiple crops
console.log("Fetching crops...");
// Check Network tab -> /api/crops
// Should return array of crops with all properties
```

### Test API Response
```bash
# In terminal
curl http://localhost:8081/api/crops \
  -H "Authorization: Bearer <accessToken>"

# Should return JSON array of crops
```

### Verify MongoDB Data
```bash
mongosh
> use agrimart
> db.crops.find()  # Check all crops
> db.users.find()  # Check all users
> db.orders.find() # Check all orders
```

---

## Key Features Verified

✅ **Authentication:** Login, registration, token management
✅ **Role-Based Access:** Different dashboards for each role
✅ **Crop Marketplace:** Customers can browse all crops from database
✅ **Order Management:** Create, track, and manage orders
✅ **Transport Integration:** Dealers can manage vehicles & service areas
✅ **Admin Controls:** Full management of users, orders, and platform
✅ **Real-time Updates:** Using MongoDB with proper data relationships
✅ **Error Handling:** Proper error messages and fallbacks
✅ **API Consistency:** All endpoints follow REST standards

---

## Next Steps (Optional Enhancements)

- [ ] Add real-time notifications (Socket.io)
- [ ] Implement payment gateway (Stripe/Razorpay)
- [ ] Add image upload to AWS S3
- [ ] Email notifications for order updates
- [ ] SMS notifications for farmers
- [ ] Advanced analytics for admin
- [ ] Mobile app (React Native)

---

## Support

For issues with backend integration:
1. Check server console for errors
2. Verify MongoDB is running
3. Check Network tab in browser DevTools
4. Verify auth token in localStorage
5. Check API response in Network tab

Last Updated: February 24, 2025
