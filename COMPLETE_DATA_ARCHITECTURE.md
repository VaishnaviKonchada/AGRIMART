# 🏗️ Complete Data Architecture & Flow Structure

## CURRENT ISSUE IDENTIFIED

**Problem**: When Farmer "Shree Krishna" added Apple crop → Not visible in:
- Farmer's "My Crops" page ❌
- Customer "Marketplace" page ❌
- Admin Farmer Management page ❌

**Root Cause**: Data is not properly associated with the farmer who created it.

---

## 🎯 DESIRED STRUCTURE (What You're Building)

### Role-Based Data Flow:

```
┌─────────────────────────────────────────────────────────────────┐
│                      COMPLETE SYSTEM FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. FARMER REGISTERS & ADDS CROP
   └─ Farmer "Shree Krishna" (farmer@email.com)
       │
       ├─→ Adds Crop "Apple"
       │   ├─ Stored in: MongoDB Crops collection
       │   ├─ Linked to: Farmer's _id
       │   └─ Status: Active crop
       │
       ├─→ Visible at:
       │   ├─ /farmer/my-crops (Only this farmer's crops) ✓
       │   ├─ /admin/farmers-management (Under this farmer) ✓
       │   └─ /home (Customer marketplace - all active crops) ✓
       │
       └─→ API Calls Made:
           ├─ POST /api/crops/add (Create crop)
           ├─ GET /api/crops/my-crops (Get farmer's crops)
           └─ GET /api/crops (Get all active crops for marketplace)


2. DEALER REGISTERS & ADDS SERVICE DATA
   └─ Dealer "XYZ Transport" (dealer@email.com)
       │
       ├─→ Creates Service Area & Info
       │   ├─ Stored in: MongoDB Dealers collection
       │   ├─ Linked to: Dealer's _id
       │   └─ Status: Active service
       │
       ├─→ Visible at:
       │   ├─ /transport-dealer-dashboard (Own info) ✓
       │   ├─ /admin/dealers-management (Under this dealer) ✓
       │   └─ /transport-dealers (Customer view - all dealers) ✓
       │
       └─→ API Calls Made:
           ├─ PUT /api/dealers/profile (Update dealer info)
           ├─ GET /api/dealers/me (Get own info)
           └─ GET /api/dealers (Get all active dealers)


3. CUSTOMER REGISTERS
   └─ Customer "Priya" (customer@email.com)
       │
       ├─→ Account Created
       │   ├─ Stored in: MongoDB Users collection
       │   ├─ Linked to: Customer's _id
       │   └─ Status: Active user
       │
       ├─→ Visible at:
       │   ├─ /account (Own customer page) ✓
       │   └─ /admin/customers-management (Under customers) ✓
       │
       └─→ API Calls Made:
           ├─ POST /api/auth/register (Registration)
           ├─ GET /api/users/me (Get own profile)
           └─ PUT /api/users/profile (Update profile)


4. ADMIN MANAGEMENT
   └─ Admin "Vennela" (admin@email.com)
       │
       ├─→ Views All Data
       │   ├─ /admin/customers-management (All customers) ✓
       │   ├─ /admin/farmers-management (All farmers + their crops) ✓
       │   ├─ /admin/dealers-management (All dealers) ✓
       │   └─ /admin/orders-monitoring (All orders) ✓
       │
       └─→ API Calls Made:
           ├─ GET /api/admin/customers (All customers)
           ├─ GET /api/admin/farmers (All farmers)
           ├─ GET /api/admin/dealers (All dealers)
           └─ GET /api/admin/crops (All crops with farmer info)
```

---

## 📊 DATABASE SCHEMA (What Gets Stored Where)

### 1. USER COLLECTION (Stores all registered users)
```javascript
{
  _id: ObjectId,
  name: String,        // "Shree Krishna", "Priya", etc.
  email: String,       // Unique email
  role: String,        // "farmer", "customer", "dealer", "admin"
  profile: {
    country: String,
    state: String,
    district: String,
    mandal: String,
    doorNo: String,
    pincode: String,
    locationText: String
  },
  createdAt: Date,
  updatedAt: Date
}

Example:
{
  _id: "farmer123",
  name: "Shree Krishna",
  email: "farmer.shree@gmail.com",
  role: "farmer",
  profile: { ... }
}
```

### 2. CROP COLLECTION (Stores all crops)
```javascript
{
  _id: ObjectId,
  name: String,              // "Apple"
  farmerId: ObjectId,        // ← KEY! Links to farmer who added it
  category: String,          // "Fruit"
  quantity: Number,          // 50
  pricePerKg: Number,        // ₹50
  description: String,
  image: String,
  location: {
    state: String,
    district: String,
    mandal: String
  },
  status: String,            // "active", "sold", "hidden"
  createdAt: Date,
  updatedAt: Date
}

Example:
{
  _id: "crop456",
  name: "Apple",
  farmerId: "farmer123",     // ← Shree Krishna's ID
  category: "Fruit",
  quantity: 50,
  pricePerKg: 50,
  status: "active",
  createdAt: "2026-02-21T..."
}
```

### 3. DEALER COLLECTION (Stores dealer information)
```javascript
{
  _id: ObjectId,
  dealerId: ObjectId,        // ← Links to dealer user
  companyName: String,
  serviceArea: [String],     // ["Chittoor", "Tirupati"]
  capacity: Number,
  pricePerKm: Number,
  rating: Number,
  createdAt: Date,
  updatedAt: Date
}

Example:
{
  _id: "dealer789",
  dealerId: "dealeruser123",
  companyName: "XYZ Transport",
  serviceArea: ["Chittoor", "Tirupati"],
  capacity: 5000,
  pricePerKm: 10
}
```

---

## 🔌 API ENDPOINTS (What Data Flows Where)

### FARMER ENDPOINTS
```javascript
// Farmer adds a crop
POST /api/crops/add
  Body: {
    name: "Apple",
    category: "Fruit",
    quantity: 50,
    pricePerKg: 50,
    ...
  }
  Headers: { Authorization: "Bearer JWT_TOKEN" }
  Backend: 
    ├─ Extract farmerId from JWT
    ├─ Save crop with farmerId linked
    └─ Return success

// Farmer gets their own crops (My Crops page)
GET /api/crops/my-crops
  Headers: { Authorization: "Bearer JWT_TOKEN" }
  Backend:
    ├─ Extract farmerId from JWT
    ├─ Find all crops where farmerId == this farmer
    └─ Return array of crops
  Frontend: Display on /farmer/my-crops

// Farmer updates their crop
PUT /api/crops/:cropId
  Body: { quantity, price, ... }
  Headers: { Authorization: "Bearer JWT_TOKEN" }
  Backend:
    ├─ Verify farmer owns this crop
    ├─ Update crop
    └─ Return updated crop

// Farmer deletes their crop
DELETE /api/crops/:cropId
  Headers: { Authorization: "Bearer JWT_TOKEN" }
  Backend:
    ├─ Verify farmer owns this crop
    ├─ Delete crop
    └─ Return success
```

### CUSTOMER ENDPOINTS
```javascript
// Customer gets all active crops (Marketplace)
GET /api/crops
  Query: { status: "active" }
  Backend:
    ├─ Find all crops where status == "active"
    ├─ For each crop, fetch farmer details (farmerId lookup)
    └─ Return array with crop + farmer info
  Frontend: Display on /home

// Customer gets specific crop details
GET /api/crops/:cropId
  Backend:
    ├─ Find crop by ID
    ├─ Look up farmer details using farmerId
    ├─ Include farmer profile & rating
    └─ Return crop + farmer data
  Frontend: Display on /crop-details

// Customer gets all transport dealers
GET /api/dealers
  Backend:
    ├─ Find all active dealers
    ├─ Return dealer list
    └─ Return array of dealers
  Frontend: Display on /transport-dealers
```

### ADMIN ENDPOINTS
```javascript
// Admin gets all customers
GET /api/admin/customers
  Headers: { Authorization: "Bearer ADMIN_TOKEN" }
  Backend:
    ├─ Verify admin role
    ├─ Find all users where role == "customer"
    └─ Return array of customers
  Frontend: Display on /admin/customers-management

// Admin gets all farmers (with their crops)
GET /api/admin/farmers
  Headers: { Authorization: "Bearer ADMIN_TOKEN" }
  Backend:
    ├─ Verify admin role
    ├─ Find all users where role == "farmer"
    ├─ For each farmer, fetch their crops (farmerId lookup)
    └─ Return array of farmers with crops
  Frontend: Display on /admin/farmers-management

// Admin gets all dealers
GET /api/admin/dealers
  Headers: { Authorization: "Bearer ADMIN_TOKEN" }
  Backend:
    ├─ Verify admin role
    ├─ Find all dealers
    └─ Return array of dealers
  Frontend: Display on /admin/dealers-management

// Admin gets all crops (with farmer info)
GET /api/admin/crops
  Headers: { Authorization: "Bearer ADMIN_TOKEN" }
  Backend:
    ├─ Verify admin role
    ├─ Find all crops
    ├─ For each crop, fetch farmer details
    └─ Return array with crop + farmer info
```

---

## 🎨 FRONTEND PAGES (What Each Page Displays)

### FARMER PAGES
```
/farmer/my-crops
├─ Fetches: GET /api/crops/my-crops
├─ Shows: Only crops added by this farmer
├─ Displays:
│  ├─ Crop name
│  ├─ Quantity
│  ├─ Price
│  ├─ Status (Active/Sold/Hidden)
│  ├─ Edit button
│  └─ Delete button
└─ Example:
   - Apple (50 kg) - ₹50/kg - Active - Edit - Delete
   - Orange (30 kg) - ₹60/kg - Active - Edit - Delete
```

### CUSTOMER PAGES
```
/home (Marketplace)
├─ Fetches: GET /api/crops?status=active
├─ Shows: All active crops from all farmers
├─ Displays:
│  ├─ Crop name
│  ├─ Farmer name (from farmerId lookup)
│  ├─ Quantity available
│  ├─ Price
│  ├─ Farmer Profile button
│  └─ Add to Cart button
└─ Example:
   - Apple by Shree Krishna (50 kg) - ₹50/kg
   - Orange by Ram Kumar (30 kg) - ₹60/kg

/crop-details (Specific Crop)
├─ Fetches: GET /api/crops/:cropId
├─ Shows: Crop details + Farmer information
├─ Displays:
│  ├─ Crop details (name, quantity, price)
│  ├─ Farmer Profile (name, rating, location)
│  ├─ Farmer Crops button (view all crops by this farmer)
│  └─ Add to Cart button
└─ Example:
   - Apple | 50 kg | ₹50/kg
   - Farmer: Shree Krishna
   - Rating: 4.5 ⭐
   - Location: Tirupati, Chittoor

/transport-dealers
├─ Fetches: GET /api/dealers
├─ Shows: All available transport dealers
├─ Displays:
│  ├─ Dealer name
│  ├─ Service area
│  ├─ Price per km
│  ├─ Rating
│  └─ Contact button
└─ Example:
   - XYZ Transport
   - Areas: Chittoor, Tirupati
   - ₹10/km
```

### ADMIN PAGES
```
/admin/customers-management
├─ Fetches: GET /api/admin/customers
├─ Shows: All registered customers
├─ Displays:
│  ├─ Name
│  ├─ Email
│  ├─ Phone
│  ├─ Location
│  ├─ Join date
│  ├─ Total orders
│  └─ Status (Active/Blocked)
└─ Example:
   - Priya | priya@gmail.com | Chittoor | 5 orders

/admin/farmers-management
├─ Fetches: GET /api/admin/farmers
├─ Shows: All registered farmers + their crops
├─ Displays for each farmer:
│  ├─ Name
│  ├─ Email
│  ├─ Location
│  ├─ Total crops added
│  ├─ List of crops (name, quantity, price)
│  ├─ Rating
│  └─ Status (Active/Blocked)
└─ Example:
   - Shree Krishna | farmer.shree@gmail.com | Tirupati
     ├─ Total Crops: 2
     ├─ Apple (50 kg) - ₹50/kg - Active
     └─ Orange (30 kg) - ₹60/kg - Active

/admin/dealers-management
├─ Fetches: GET /api/admin/dealers
├─ Shows: All registered dealers
├─ Displays:
│  ├─ Company name
│  ├─ Service areas
│  ├─ Capacity
│  ├─ Price per km
│  ├─ Rating
│  └─ Status
└─ Example:
   - XYZ Transport
   - Areas: Chittoor, Tirupati
   - Capacity: 5000 kg
   - ₹10/km
```

---

## 🔄 CURRENT STATE vs DESIRED STATE

### ❌ CURRENT (Problem)
```
Farmer "Shree Krishna" adds Apple crop
  └─ Data saved ✓
  └─ NOT visible in /farmer/my-crops ❌
  └─ NOT visible in /home (customer page) ❌
  └─ NOT visible in /admin/farmers-management ❌

Root Cause:
├─ Crop not linked to farmer (no farmerId)
├─ /farmer/my-crops not fetching correctly
  ├─ /home not showing crops
└─ Admin page not showing farmer's crops
```

### ✅ DESIRED (Solution)
```
Farmer "Shree Krishna" adds Apple crop
  └─ Data saved with farmerId = "farmer123" ✓
  └─ Visible in /farmer/my-crops ✓
  └─ Visible in /home with farmer name ✓
  └─ Visible in /admin/farmers-management ✓
  └─ Customer can see farmer details via crop ✓

Components needed:
├─ Proper farmerId in Crop document
├─ API to get farmer's crops
├─ API to get all active crops
├─ Farmer page to display own crops
├─ Customer page to display all crops
└─ Admin page to display farmer + crops
```

---

## 📋 CHECKLIST: What Needs to Exist

### Database Level:
- [ ] Crop model has `farmerId` field (links to User)
- [ ] Dealer model has `dealerId` field (links to User)
- [ ] All relationships proper

### Backend API Level:
- [ ] `POST /api/crops/add` - With farmerId from JWT
- [ ] `GET /api/crops/my-crops` - Gets farmer's crops
- [ ] `GET /api/crops` - Gets all active crops
- [ ] `GET /api/crops/:cropId` - With farmer details
- [ ] `GET /api/admin/customers` - All customers
- [ ] `GET /api/admin/farmers` - All farmers with crops
- [ ] `GET /api/admin/dealers` - All dealers
- [ ] `GET /api/dealers` - For customers to see

### Frontend Level:
- [ ] `/farmer/my-crops` - Display farmer's crops
- [ ] `/home` - Display all active crops with farmer names
- [ ] `/crop-details` - Show crop + farmer info
- [ ] `/transport-dealers` - Show all dealers
- [ ] `/admin/customers-management` - Show all customers
- [ ] `/admin/farmers-management` - Show farmers + crops
- [ ] `/admin/dealers-management` - Show all dealers

---

## 🚀 NEXT STEPS

### Step 1: Verify Database
Check if crops have `farmerId` field:
```javascript
db.crops.findOne()
// Should show: { _id, name, farmerId, ... }
```

### Step 2: Check Backend APIs
Verify these endpoints exist and work:
- GET /api/crops/my-crops (for farmer)
- GET /api/crops (for customers)
- GET /api/admin/farmers (for admin)

### Step 3: Check Frontend
Verify pages fetch correct data:
- /farmer/my-crops ← Uses GET /api/crops/my-crops
- /home ← Uses GET /api/crops
- /admin/farmers-management ← Uses GET /api/admin/farmers

### Step 4: If Missing
I can help create/fix any missing pieces.

---

## 📝 Summary

**The architecture you need:**
```
Farmer creates Crop
  ↓
Crop saved with farmerId linked ✓
  ↓
Farmer sees in /farmer/my-crops ✓
Customer sees in /home ✓
Admin sees in /admin/farmers-management ✓
  ↓
System complete! ✓
```

**All data flows from role-specific actions to appropriate pages.**

Is this the structure you need? Should I now help implement the missing pieces?
