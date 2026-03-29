# 🌾 AgriMart Crop Marketplace - Backend Integration Guide

## System Overview

This is a **Real-World Crop Marketplace** where:
- **Farmers** add crops to the database
- **Customers** browse and view crops added by all farmers
- **Backend** manages all data persistence and business logic
- **No hardcoded data** - everything is database-driven

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CUSTOMER JOURNEY                          │
├─────────────────────────────────────────────────────────────┤
│  1. Customer logs in as "Customer"                           │
│  2. Navigates to Home page                                  │
│  3. GET http://localhost:8081/api/crops (all active crops)  │
│  4. React displays crops in grid format                     │
│  5. Customer clicks "View Details" to see crop details      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    FARMER JOURNEY                            │
├─────────────────────────────────────────────────────────────┤
│  1. Farmer logs in as "Farmer"                              │
│  2. Navigates to AddCrop page                               │
│  3. Fills crop form (name, price, quantity, etc.)           │
│  4. POST http://localhost:8081/api/crops (with JWT token)   │
│  5. Backend stores crop in MongoDB with farmerId            │
│  6. Success message shown to farmer                         │
│  7. Crop immediately visible on all customers' home pages   │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend Implementation

### 1. **Crop Model** (`server/src/models/Crop.js`)

```javascript
Fields:
- cropName (String) - Name of crop
- category (String) - Vegetable, Fruit, Grain, Spice, Herb, Other
- pricePerKg (Number) - Price per kilogram
- availableQuantity (Number) - Stock in kg
- images (Array) - Image URLs
- description (String) - Product description
- isOrganic (Boolean) - Organic certification
- quality (String) - Premium, Standard, Economy
- farmerId (ObjectId) - Reference to User who added it
- isActive (Boolean) - Active listing
- status (String) - listed, sold, hidden
- timestamps (Dates) - createdAt, updatedAt
```

### 2. **Crops Routes** (`server/src/routes/crops.js`)

#### Public Endpoints (No Authentication Required)

**GET /api/crops**
- Returns all active crops
- Filters: category, search, minPrice, maxPrice
- Example: `GET /api/crops?category=Vegetable&minPrice=10&maxPrice=100`

**GET /api/crops/:id**
- Returns single crop details
- Includes farmer information

#### Protected Endpoints (Farmer Only - Requires JWT Token)

**POST /api/crops** ✅ Add crop
- Required fields: cropName, category, pricePerKg, availableQuantity
- Optional fields: description, images, isOrganic, quality, etc.
- Authorization: `Bearer <JWT_TOKEN>`

**PUT /api/crops/:id** ✅ Update crop
- Can update own crops only
- Authorization: `Bearer <JWT_TOKEN>`

**DELETE /api/crops/:id** ✅ Delete crop
- Can delete own crops only
- Authorization: `Bearer <JWT_TOKEN>`

**GET /api/crops/my-crops/list** ✅ Get farmer's crops
- Returns all crops added by logged-in farmer
- Authorization: `Bearer <JWT_TOKEN>`

---

## Frontend Implementation

### 1. **Farmer - AddCrop Page** (`src/farmer/AddCrop.js`)

**What Changed:**
- ✅ Changed from localStorage to backend API
- ✅ Added JWT token authentication
- ✅ Sends POST request to `/api/crops`
- ✅ Shows success/error messages

**How it Works:**
```javascript
// When farmer clicks "Save Crop"
1. Get JWT token from localStorage: authToken
2. Validate form data
3. Send POST to http://localhost:8081/api/crops
4. Include Authorization header: "Bearer {token}"
5. If success: Show success message & reset form
6. If error: Show error message
```

### 2. **Customer - Home Page** (`src/pages/Home.js`)

**What Changed:**
- ✅ Enhanced logging for debugging
- ✅ Better field mapping (supports both old & new field names)
- ✅ Shows farmer information
- ✅ Handles image array format

**How it Works:**
```javascript
// When customer opens Home page
1. Component mounts
2. Fetch GET http://localhost:8081/api/crops
3. If success: Display crops in grid
4. If error: Show fallback crops (for offline support)
5. Each crop card shows: name, price, category, farmer name, image
```

### 3. **Login Page** (`src/pages/Login.js`)

**What Changed:**
- ✅ Saves token as both `accessToken` and `authToken`
- ✅ Saves user role for easier access
- ✅ Saves JWT token without JSON.stringify (it's a string already)

---

## Database Schema

### Users Collection
```json
{
  "_id": ObjectId,
  "name": "Ramesh Kumar",
  "email": "ramesh@example.com",
  "passwordHash": "bcrypt_hash",
  "role": "farmer",
  "status": "active",
  "profile": {...},
  "createdAt": Date,
  "updatedAt": Date
}
```

### Crops Collection
```json
{
  "_id": ObjectId,
  "cropName": "Tomato",
  "category": "Vegetable",
  "pricePerKg": 30,
  "availableQuantity": 100,
  "images": ["url1", "url2"],
  "description": "Fresh red tomatoes",
  "farmerId": ObjectId("user_id"),
  "isActive": true,
  "status": "listed",
  "isOrganic": false,
  "quality": "Standard",
  "createdAt": Date,
  "updatedAt": Date
}
```

---

## Complete Flow Example

### Step 1: Farmer Registration & Login
```
1. Farmer registers with email: farmer@example.com, password: Test123!@, role: farmer
2. Data stored in Users collection
3. Farmer logs in
4. Backend returns JWT token
5. Token saved to localStorage as "authToken"
```

### Step 2: Farmer Adds Crop
```
1. Farmer navigates to /farmer/add-crop
2. Fills form:
   - Crop Name: "Tomato"
   - Category: "Vegetable"
   - Price: ₹30
   - Quantity: 100 kg
   - Description: "Fresh red tomatoes from farm"
   - Images: [optional]
3. Clicks "Save Crop"
4. Frontend sends:
   POST http://localhost:8081/api/crops
   Headers: {"Authorization": "Bearer eyJ...token..."}
   Body: {
     "cropName": "Tomato",
     "category": "Vegetable",
     "pricePerKg": 30,
     "availableQuantity": 100,
     "description": "Fresh red tomatoes from farm",
     "isOrganic": false,
     "quality": "Standard"
   }
5. Backend validates and creates crop in MongoDB
6. Returns success response with crop _id
7. Frontend shows "✅ Crop added successfully!"
```

### Step 3: Customer Browses Crops
```
1. Customer registers & logs in
2. Navigates to /home
3. Home page loads and calls: GET http://localhost:8081/api/crops
4. Backend returns ALL crops from all farmers (where isActive=true and status='listed')
5. Frontend displays crops in grid:
   - Shows crop image
   - Shows crop name: "Tomato"
   - Shows price: ₹30/kg
   - Shows category badge: "Vegetable"
   - Shows farmer name: "Ramesh Kumar" (if available)
   - Shows "View Details" button
6. Customer can click to view full details, add to cart, etc.
```

### Step 4: Customer Views Crop Details
```
1. Customer clicks "View Details" on Tomato crop
2. selectedCrop stored in localStorage
3. Navigates to /crop-details
4. Displays:
   - Full crop information
   - Farmer details
   - Customer can add to cart
   - Customer can proceed to checkout
```

---

## Error Handling

### Farmer Adding Crop Errors
```javascript
// Validation errors (400)
- Missing required fields
- Invalid price/quantity (negative or zero)
- Database validation fails

// Authentication errors (401/403)
- No token provided
- Token expired
- User role is not "farmer"
- Database errors
```

### Customer Viewing Crops Errors
```javascript
// Backend unavailable (500)
- Falls back to hardcoded crops
- Shows loading message to user

// Network errors
- Shows error in console
- Still displays fallback crops

// No crops found
- Shows "No crops found" message
```

---

## Testing the System

### Test Case 1: Farmer Adds Crop
```
1. Open http://localhost:3000
2. Register as: email: farmer1@example.com, role: farmer
3. Login with same credentials
4. Navigate to Farmer Dashboard → Add Crop
5. Fill form:
   - Name: "Carrot"
   - Category: "Vegetable"
   - Price: ₹35
   - Quantity: 50
6. Click Save
7. Check backend logs for: "✅ Crop created"
8. Check MongoDB: crop should be in Crops collection
```

### Test Case 2: Customer Views Crops
```
1. Open http://localhost:3000 (in new tab)
2. Register as: email: customer1@example.com, role: customer
3. Login with same credentials
4. Should navigate to /home
5. Should see "Carrot" crop added by farmer
6. Check browser console for: "✅ Crops fetched successfully"
7. Verify crop shows: name, price (₹35), category, farmer name
```

### Test Case 3: Multiple Farmers
```
1. Register 2 different farmer accounts
2. Each farmer adds different crops
3. Login as customer
4. Home page should show crops from both farmers
5. Each crop card should show correct farmer name
```

---

## API Testing with PowerShell (Optional)

### Get All Crops
```powershell
Invoke-RestMethod -Uri "http://localhost:8081/api/crops" -Method GET
```

### Get Single Crop
```powershell
Invoke-RestMethod -Uri "http://localhost:8081/api/crops/{CROP_ID}" -Method GET
```

### Add Crop as Farmer
```powershell
$headers = @{"Authorization" = "Bearer YOUR_JWT_TOKEN"; "Content-Type" = "application/json"}
$body = @{
  cropName = "Apple"
  category = "Fruit"
  pricePerKg = 120
  availableQuantity = 50
  description = "Fresh apples"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8081/api/crops" -Method POST -Headers $headers -Body $body
```

---

## Common Issues & Solutions

### Issue: "Crop added successfully" but not visible on customer home
**Solution:** 
- Refresh customer home page
- Check browser console for crop fetch logs
- Verify backend is still running
- Check MongoDB to confirm crop exists

### Issue: 403 Forbidden when adding crop
**Solution:**
- Verify user role is "farmer" (check localStorage)
- Verify JWT token is valid (hasn't expired)
- Verify token is being sent in Authorization header

### Issue: Crops not showing on home page
**Solution:**
- Check if backend is running on port 8081
- Open browser DevTools → Network tab → Check /api/crops request
- Verify fallback crops appear (means API is down)
- Check backend logs for errors

### Issue: Image not displaying on crop card
**Solution:**
- Verify image URLs are accessible
- Check browser console for image loading errors
- Placeholder image should show if URL is broken

---

## File Summary

| File | Purpose | Changes |
|------|---------|---------|
| `server/src/models/Crop.js` | Crop database schema | ✅ Enhanced with more fields |
| `server/src/routes/crops.js` | CRUD endpoints | ✅ Complete rewrite with auth |
| `src/farmer/AddCrop.js` | Farmer add crop form | ✅ Now sends to backend |
| `src/pages/Home.js` | Customer home page | ✅ Better logging & field handling |
| `src/pages/Login.js` | User authentication | ✅ Saves token properly |

---

## Next Steps (Optional Enhancements)

1. **Image Upload** - Store images as base64 or use cloud storage
2. **Search & Filtering** - Customer can search by crop name, price range, etc.
3. **Farmer Ratings** - Customers can rate farmers after purchase
4. **Crop Availability** - Reduce quantity when customer buys
5. **Order Management** - Farmers can view and manage orders
6. **Payment Integration** - Add payment gateway for orders
7. **Admin Dashboard** - Monitor all crops and transactions
8. **Reviews & Ratings** - Customers can review crops

---

**Now you have a REAL-WORLD crop marketplace! 🎉**
