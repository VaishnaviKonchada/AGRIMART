# Transport Dealer System - Complete Implementation Guide

## 📋 Overview

The Transport Dealer system is now fully integrated with real backend processing. Dealers are filtered based on:
1. **Distance** between pickup (farmer) and drop (customer) locations
2. **Location matching** - dealers must service both locations
3. **Vehicle type** - automatically determined by distance:
   - BIKE: 0-5 km
   - AUTO: 5-50 km
   - TRUCK: 50+ km
4. **Real-time 5-minute request notification** system

---

## 🔧 Backend Implementation

### 1. Database Models

#### **TransportDealer Model** (`server/src/models/TransportDealer.js`)
Stores dealer profile with:
- Vehicle fleet (BIKE, AUTO, TRUCK)
- Service locations (pickup & drop)
- Pricing (base price, per-km, per-kg)
- Rating and reviews
- Bank details
- Verification status

```javascript
vehicles: [
  {
    vehicleType: 'BIKE|AUTO|TRUCK',
    registrationNumber: String,
    capacity: Number (kg),
    basePrice: Number,
    perKmPrice: Number,
    pricePerKg: Number,
    isActive: Boolean
  }
],
pickupLocations: [String],     // Cities dealer can pick from
dropLocations: [String],       // Cities dealer can deliver to
rating: Number,
reviewCount: Number,
totalTrips: Number,
totalEarnings: Number
```

#### **DealerRequest Model** (`server/src/models/DealerRequest.js`)
Tracks customer requests to dealers with 5-minute expiry:
- Request status: PENDING, ACCEPTED, REJECTED, EXPIRED, COMPLETED
- Auto-expiry at 5 minutes
- Notification tracking
- Customer and dealer references

### 2. Distance Calculation Service

**File:** `server/src/services/distanceService.js`

Features:
- Haversine formula for accurate distance calculation
- Pre-loaded coordinates for 40+ Indian cities
- Automatic vehicle type selection based on distance
- Location fuzzy matching

**Key Functions:**
```javascript
getDistanceBetweenCities(pickupCity, dropCity) // Returns: 25.5 km
getVehicleTypeByDistance(distance)              // Returns: 'AUTO'
filterDealers(dealers, vehicleType, pickupLoc, dropLoc)
calculateQuotedPrice(vehicleType, distance, quantity, basePrice, ...)
```

### 3. API Endpoints

**Base URL:** `http://localhost:8081/api/transport-dealers`

#### Filtering & Discovery (Public)

**GET `/filter`** - Get dealers filtered by distance and location
```
Query: pickupLocation, dropLocation, quantity
Response: {
  distance: 25.5,
  vehicleType: 'AUTO',
  dealerCount: 5,
  dealers: [
    {
      _id, dealerId, dealerName, dealerPhone, dealerPhoto,
      rating, reviewCount, totalTrips,
      vehicle: { vehicleType, capacity, registrationNumber },
      quotedPrice: 1250,
      distance: 25.5,
      pickupLocations, dropLocations
    }
  ]
}
```

#### Request Management

**POST `/request`** - Customer initiates chat with dealer
```
Auth: Required (customer)
Body: {
  dealerId: ObjectId,
  pickupLocation: String,
  dropLocation: String,
  quantity: Number,
  farmerName: String,
  farmerLocation: String,
  quotedPrice: Number,
  vehicleType: 'BIKE|AUTO|TRUCK'
}
Response: {
  success: true,
  requestId: ObjectId,
  expiresAt: ISO8601,
  message: '...'
}
```

**GET `/request/:requestId`** - Check request status
```
Response: {
  status: 'PENDING|ACCEPTED|REJECTED|EXPIRED',
  dealerName: String,
  quotedPrice: Number,
  expiresAt: ISO8601,
  timeRemaining: ms
}
```

#### Dealer Management (Protected)

**GET `/pending`** - Get pending requests for dealer
```
Auth: Required (dealer)
Response: {
  count: 3,
  requests: [...]
}
```

**PUT `/request/:requestId/accept`** - Dealer accepts request
```
Auth: Required (dealer)
Response: { success: true, message: '...' }
```

**PUT `/request/:requestId/reject`** - Dealer rejects request
```
Auth: Required (dealer)
Response: { success: true, message: '...' }
```

---

## 👨‍💼 Dealer Registration & Management

**File:** `server/src/routes/dealer.js` (Updated)

### Register Transport Details
**POST `/api/dealer/register-transport`**
```
Auth: Required (dealer)
Body: {
  pickupLocations: ['Vijayawada', 'Guntur'],
  dropLocations: ['Hyderabad', 'Warangal'],
  bankAccountNumber: String,
  bankIFSC: String,
  bankAccountHolder: String,
  address: String,
  city: String,
  state: String,
  pincode: String,
  alternatePhone: String
}
```

### Add Vehicle to Fleet
**POST `/api/dealer/add-vehicle`**
```
Auth: Required (dealer)
Body: {
  vehicleType: 'BIKE|AUTO|TRUCK',
  registrationNumber: 'AP07AB1234',
  capacity: 100,  // kg
  basePrice: 500,
  perKmPrice: 10,
  pricePerKg: 5
}
```

### Get Dealer's Vehicles
**GET `/api/dealer/vehicles`**
```
Response: { vehicles: [...] }
```

### Get Complete Transport Profile
**GET `/api/dealer/transport-profile`**
```
Response: { profile: {...TransportDealer} }
```

---

## 🎨 Frontend Implementation

### TransportDealers.js (`src/pages/TransportDealers.js`)

**Features Implemented:**

1. **Auto-fetch dealers on page load**
   ```javascript
   - Reads currentTransportOrder from localStorage
   - Calls GET /api/transport-dealers/filter
   - Displays dealers for pickup location
   ```

2. **Real-time dealer filtering by drop location**
   ```javascript
   - User types drop location
   - Auto-calls backend to recalculate distance
   - Auto-selects vehicle type (BIKE/AUTO/TRUCK)
   - Shows only matching dealers with new prices
   ```

3. **Smart 5-minute request system**
   ```javascript
   - Customer clicks "Initiate Chat"
   - POST /api/transport-dealers/request to backend
   - Shows "Waiting for response: 4:59"
   - Timer counts down every second
   - Polls backend every second for acceptance
   - Auto-opens chat if dealer accepts
   - Shows "Request Expired" if timeout
   ```

4. **Price display & calculation**
   ```javascript
   - Quoted price calculated by backend
   - Formula: basePrice + (distance × perKmPrice) + (quantity × pricePerKg)
   - Displayed on each dealer card
   - Dynamic price updates on location change
   ```

---

## 🔀 Data Flow

### 1. Customer Views Dealers
```
Customer selects quantity on cart
↓
Frontend saves to: currentTransportOrder (localStorage)
↓
Navigate to /transport-dealers
↓
Page loads → GET /api/transport-dealers/filter
  pickupLocation: farmer location
  dropLocation: same (initial)
  quantity: order quantity
↓
Backend calculates distance (0km, vehicle = BIKE)
↓
Filters dealers with BIKE, serving both locations
↓
Calculates quotedPrice for each dealer
↓
Returns sorted by price (lowest first)
↓
Display dealers with prices, rating, capacity
```

### 2. Customer Enters Drop Location
```
User types drop location (e.g., "Mumbai")
↓
onChange → handleLocationChange()
↓
GET /api/transport-dealers/filter
  pickupLocation: farmer location (unchanged)
  dropLocation: Mumbai
  quantity: order quantity
↓
Backend calculates NEW distance (e.g., 450km, vehicle = TRUCK)
↓
Filters TRUCK dealers serving farmer location AND Mumbai
↓
Recalculates prices for TRUCK rates
↓
Display updated dealers list
↓
If no dealers: show ⚠️ "No dealers available for Mumbai"
```

### 3. Customer Initiates Chat (5-Minute Request)
```
Customer clicks "Initiate Chat"
↓
POST /api/transport-dealers/request
  dealerId, pickupLocation, dropLocation, quotedPrice, etc.
↓
Backend creates DealerRequest document
  status: PENDING
  expiresAt: now + 5 minutes
  notificationSent: true
↓
Returns requestId & expiresAt
↓
Frontend starts timer:
  - Updates button: "⏳ 4:59"
  - Polls /api/transport-dealers/request/:requestId every 1 second
  - Checks if dealer accepted (status == ACCEPTED)
  - If accepted → openChat() and navigate
  - If 5 min passed → mark EXPIRED
↓
If dealer accepts within 5 min:
  - Button shows "✅ Dealer Accepted!"
  - Chat opens automatically
  - DealerRequest status: ACCEPTED
  - Chat page opens with dealer info
```

### 4. Dealer Accepts Request (Backend Side)
```
Dealer gets notification (future: push/SMS)
↓
Dealer clicks "Accept" on their dashboard
↓
PUT /api/transport-dealers/request/:requestId/accept
  Auth: dealer token
↓
Backend updates DealerRequest
  status: ACCEPTED
  respondedAt: now
↓
Response: { success: true }
↓
Frontend detects acceptance on next poll
↓
Auto-opens chat
```

---

## 📍 Supported Cities for Distance Calculation

**40+ Indian cities pre-loaded with coordinates:**

Andhra Pradesh:
- Rajahmundry, Kakinada, Visakhapatnam, Vijayawada, Guntur, Hyderabad
- Eluru, Warangal, Khammam, Tirupati, Chittoor, Nellore, Kurnool
- And 25+ more...

Can add more cities by updating `CITY_COORDINATES` in `distanceService.js`

---

## 🚀 How to Test

### 1. Start Backend
```bash
cd server
node src/index.js
```

### 2. Start Frontend
```bash
npm start
```

### 3. Register a Dealer (Optional - Can Skip if Testing as Customer)
```javascript
POST http://localhost:8081/api/auth/register
{
  name: "Raju Transport",
  email: "raju@transport.com",
  password: "test123",
  role: "dealer"
}

Then POST http://localhost:8081/api/dealer/register-transport
{
  pickupLocations: ["Vijayawada", "Guntur"],
  dropLocations: ["Hyderabad", "Warangal", "Khammam"],
  bankAccountNumber: "123456789",
  bankIFSC: "SBIN0001234",
  bankAccountHolder: "Raju",
  address: "123 Main St",
  city: "Vijayawada",
  state: "AP",
  pincode: "520001"
}

Then POST http://localhost:8081/api/dealer/add-vehicle
{
  vehicleType: "AUTO",
  registrationNumber: "AP07AB1234",
  capacity: 100,
  basePrice: 500,
  perKmPrice: 10
}
```

### 4. Test Customer Flow
```
1. Register as customer
2. Login
3. Go to /home → select crop → add to cart
4. Proceed to checkout
5. Click "Request Transport"
6. Enter drop location (e.g., "Hyderabad")
7. See filtered dealers with prices
8. Click "Initiate Chat"
9. Watch 5-minute countdown
10. Dealer accepts → chat opens
```

---

## 📊 Key Calculations

### Distance-Based Vehicle Selection
```
If distance <= 5 km    → BIKE ✓
If distance <= 50 km   → AUTO ✓
If distance > 50 km    → TRUCK ✓
```

### Price Calculation
```
QuotedPrice = basePrice + (distance × perKmPrice) + (quantity × pricePerKg)

Example:
  basePrice: 500
  distance: 25 km
  perKmPrice: 10
  quantity: 50 kg
  pricePerKg: 5
  
  Quote = 500 + (25 × 10) + (50 × 5)
        = 500 + 250 + 250
        = ₹1000
```

### 5-Minute Request Timeout
```
Request created at: 14:30:00
Expires at: 14:35:00
Countdown shows: 4:59 → 4:58 → ... → 0:00
Status after expiry: EXPIRED
Action after expiry: Button shows "❌ Request Expired"
```

---

## ⚙️ Error Handling

### Frontend Errors
- Invalid location: "⚠️ Invalid pickup or drop location"
- No dealers: "⚠️ No dealers available for 'Location'"
- API error: Displays error message from backend

### Backend Errors
- Missing fields: 400 "Missing required fields"
- Dealer not found: 404 "Dealer not found"
- Request expired: 400 "Request has expired"
- Auth required: 401 "Unauthorized"

---

## 🔐 Security

- ✅ JWT authentication required for requests
- ✅ Role-based access (dealer, customer)
- ✅ Dealer can only accept/reject their own requests
- ✅ Automatic request expiry (no infinite pending)
- ✅ No hardcoded dealer data (all from database)

---

## 📈 Future Enhancements

1. **Real-time notifications** (WebSocket/Socket.io)
   - Dealer gets instant notification instead of polling
   - Customer sees real-time dealer status updates

2. **Payment integration**
   - Capture payment when dealer accepts
   - Refund if dealer rejects after payment

3. **Ratings & reviews**
   - Customer rates dealer after trip
   - Auto-update dealer rating

4. **Route optimization**
   - Multiple pickup/drop locations in one trip
   - Suggested optimal route

5. **Advanced filtering**
   - Filter by rating, vehicle capacity, price range
   - Save favorite dealers

---

## 📝 API Summary Table

| Method | Endpoint | Auth | Role | Purpose |
|--------|----------|------|------|---------|
| GET | `/filter` | ✗ | - | Get dealers by distance/location |
| POST | `/request` | ✓ | customer | Send request to dealer |
| GET | `/request/:id` | ✗ | - | Check request status |
| GET | `/pending` | ✓ | dealer | Get pending requests |
| PUT | `/request/:id/accept` | ✓ | dealer | Accept customer request |
| PUT | `/request/:id/reject` | ✓ | dealer | Reject customer request |
| POST | `/dealer/register-transport` | ✓ | dealer | Register service areas |
| POST | `/dealer/add-vehicle` | ✓ | dealer | Add vehicle to fleet |
| GET | `/dealer/vehicles` | ✓ | dealer | List dealer's vehicles |
| GET | `/dealer/transport-profile` | ✓ | dealer | Get dealer profile |

---

## ✅ What's Working

✅ Distance calculation using Haversine formula
✅ Automatic vehicle type selection (BIKE/AUTO/TRUCK)
✅ Location matching (dealer must serve both pickup & drop)
✅ Real-time 5-minute request with countdown
✅ Backend-driven pricing (no hardcoded data)
✅ Dealer request acceptance/rejection
✅ Error handling for all edge cases
✅ JWT authentication & authorization
✅ Responsive UI with real-time updates
✅ Auto-chat open when dealer accepts

---

Generated: January 30, 2026
