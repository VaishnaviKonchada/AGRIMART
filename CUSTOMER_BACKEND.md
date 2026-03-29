# Customer Backend Integration Guide

Complete backend API specification for the **Customer role** in Agrimart. Maps to all customer-facing frontend pages.

## Frontend Pages Covered

| Frontend Page | Backend Endpoint | Purpose |
|---|---|---|
| Register.js | `POST /api/auth/register` | Create customer account |
| Login.js | `POST /api/auth/login` | Authenticate customer |
| Home.js | `GET /api/crops` | Browse all available crops |
| CropDetails.js | `GET /api/crops/:id` | View crop details & farmer info |
| Chat.js | `POST /api/chats` | Initiate dealer negotiation |
| Chat.js | `POST /api/chats/:id/message` | Send/receive messages |
| Chat.js | `POST /api/chats/:id/confirm` | Confirm transport deal |
| Payment.js | `POST /api/orders` | Place order (already dual-write) |
| MyOrders.js | `GET /api/orders` | View customer's orders |
| OrderHistory.js | `GET /api/orders` | View order history |
| DeliveryStatus.js | `GET /api/orders/:id` | Track order status |
| Account.js | `GET /api/auth/me` | View account profile |
| SupportChat.js | `POST /api/complaints` | Submit complaint |
| SupportChat.js | `GET /api/complaints` | View complaint history |

---

## API Endpoints

### Auth Endpoints (Existing)

**POST /api/auth/register**
```json
{
  "name": "John Customer",
  "email": "john@example.com",
  "password": "securepass123",
  "role": "customer"
}
```
Response:
```json
{
  "id": "user-id",
  "name": "John Customer",
  "email": "john@example.com",
  "role": "customer"
}
```

**POST /api/auth/login**
```json
{
  "email": "john@example.com",
  "password": "securepass123"
}
```
Response:
```json
{
  "accessToken": "jwt-token",
  "user": {
    "id": "user-id",
    "name": "John Customer",
    "email": "john@example.com",
    "role": "customer"
  }
}
```

---

### Crops Endpoints (New)

**GET /api/crops**
List all available crops for purchase.

Response:
```json
[
  {
    "_id": "crop-1",
    "farmerId": {
      "_id": "farmer-1",
      "name": "John Farmer",
      "email": "farmer@example.com",
      "profile": {
        "location": "Rajahmundry"
      }
    },
    "cropName": "Tomato",
    "quantity": 50,
    "pricePerKg": 200,
    "location": "Rajahmundry",
    "description": "Fresh organic tomatoes",
    "images": ["url1", "url2"],
    "status": "listed",
    "createdAt": "2026-01-20T10:00:00Z"
  }
]
```

**GET /api/crops/:id**
Get specific crop details with farmer information.

Response:
```json
{
  "_id": "crop-1",
  "farmerId": {
    "_id": "farmer-1",
    "name": "John Farmer",
    "email": "farmer@example.com",
    "profile": {
      "location": "Rajahmundry",
      "phone": "9876543210"
    }
  },
  "cropName": "Tomato",
  "quantity": 50,
  "pricePerKg": 200,
  "location": "Rajahmundry",
  "description": "Fresh organic tomatoes",
  "images": ["url1"],
  "status": "listed"
}
```

---

### Orders Endpoints (Existing + Enhanced)

**POST /api/orders** *(customer auth required)*

Frontend calls this after Payment → "Pay & Place Order" click.

```json
{
  "items": [
    {
      "cropId": "crop-1",
      "cropName": "Tomato",
      "quantity": 5,
      "pricePerKg": 200,
      "farmerName": "John Farmer",
      "farmerLocation": "Rajahmundry"
    }
  ],
  "delivery": { "drop": "Vijayawada" },
  "transport": {
    "dealerId": "dealer-1",
    "dealerName": "City Auto Logistics",
    "vehicle": "AUTO",
    "price": 600
  },
  "farmerId": "farmer-1",
  "pickup": "Rajahmundry",
  "paymentMethod": "UPI"
}
```

Response:
```json
{
  "_id": "order-1",
  "customerId": "customer-1",
  "farmerId": "farmer-1",
  "dealerId": "dealer-1",
  "items": [...],
  "delivery": { "pickup": "Rajahmundry", "drop": "Vijayawada" },
  "transport": { "dealerName": "City Auto Logistics", "vehicle": "AUTO", "price": 600 },
  "summary": {
    "itemsTotal": 1000,
    "transportFee": 600,
    "platformFee": 50,
    "total": 1650
  },
  "status": "Confirmed",
  "paymentMethod": "UPI",
  "createdAt": "2026-01-20T10:30:00Z"
}
```

**GET /api/orders** *(customer auth required)*

Customer sees only their orders.

Response:
```json
[
  {
    "_id": "order-1",
    "status": "Confirmed",
    "total": 1650,
    "delivery": { "drop": "Vijayawada" },
    "transport": { "dealerName": "City Auto Logistics" }
  }
]
```

**GET /api/orders/:id** *(customer/admin auth required)*

View specific order details.

---

### Chat Endpoints (New)

**POST /api/chats** *(customer auth required)*

Initiate chat with a transport dealer (from TransportDealers page).

```json
{
  "dealerId": "dealer-1"
}
```

Response:
```json
{
  "_id": "chat-1",
  "customerId": "customer-1",
  "dealerId": "dealer-1",
  "messages": [],
  "negotiation": { "offeredPrice": null, "finalPrice": null },
  "confirmed": false,
  "createdAt": "2026-01-20T10:00:00Z"
}
```

**GET /api/chats/:id** *(customer/dealer auth required)*

Get chat history with messages and negotiation details.

Response:
```json
{
  "_id": "chat-1",
  "customerId": { "_id": "customer-1", "name": "John Customer", "email": "john@example.com" },
  "dealerId": { "_id": "dealer-1", "name": "City Auto", "email": "dealer@example.com" },
  "messages": [
    { "senderId": "customer-1", "text": "Hi, what's your rate?", "createdAt": "2026-01-20T10:00:00Z" },
    { "senderId": "dealer-1", "text": "₹600 per trip", "createdAt": "2026-01-20T10:05:00Z" }
  ],
  "negotiation": {
    "offeredPrice": 600,
    "finalPrice": 550,
    "vehicle": "AUTO",
    "pickup": "Rajahmundry",
    "drop": "Vijayawada"
  },
  "confirmed": true,
  "confirmedAt": "2026-01-20T10:15:00Z"
}
```

**POST /api/chats/:id/message** *(customer/dealer auth required)*

Send message in chat.

```json
{
  "text": "Can you provide a quote for tomorrow?"
}
```

Response: Updated chat object with new message appended.

**POST /api/chats/:id/confirm** *(customer auth required)*

Confirm deal (called from Chat.js → "✅ Confirm & Proceed").

```json
{
  "finalPrice": 550,
  "vehicle": "AUTO",
  "pickup": "Rajahmundry",
  "drop": "Vijayawada"
}
```

Response:
```json
{
  "_id": "chat-1",
  "negotiation": {
    "finalPrice": 550,
    "vehicle": "AUTO",
    "pickup": "Rajahmundry",
    "drop": "Vijayawada"
  },
  "confirmed": true,
  "confirmedAt": "2026-01-20T10:15:00Z"
}
```

---

### Complaints Endpoints (New)

**POST /api/complaints** *(customer auth required)*

Submit complaint or support request (SupportChat.js).

```json
{
  "orderId": "order-1",
  "severity": "High",
  "message": "Order not delivered on time"
}
```

Response:
```json
{
  "_id": "complaint-1",
  "customerId": "customer-1",
  "orderId": "order-1",
  "severity": "High",
  "status": "Open",
  "message": "Order not delivered on time",
  "resolutionNotes": null,
  "createdAt": "2026-01-20T11:00:00Z"
}
```

**GET /api/complaints** *(customer auth required)*

View customer's complaint history.

Response:
```json
[
  {
    "_id": "complaint-1",
    "orderId": { "_id": "order-1", "id": "#1234567890", "total": 1650 },
    "severity": "High",
    "status": "Open",
    "message": "Order not delivered on time",
    "createdAt": "2026-01-20T11:00:00Z"
  }
]
```

---

### Payments Endpoints (New)

**GET /api/payments** *(customer auth required)*

View payment history for customer.

Response:
```json
[
  {
    "_id": "payment-1",
    "orderId": { "_id": "order-1", "id": "#1234567890", "total": 1650 },
    "amount": 1650,
    "platformFee": 50,
    "dealerPayout": 1600,
    "status": "Completed",
    "method": "UPI",
    "createdAt": "2026-01-20T10:30:00Z"
  }
]
```

**POST /api/payments** *(customer auth required)*

Create payment record (called after order is placed).

```json
{
  "orderId": "order-1",
  "amount": 1650,
  "dealerId": "dealer-1"
}
```

Response:
```json
{
  "_id": "payment-1",
  "orderId": "order-1",
  "customerId": "customer-1",
  "dealerId": "dealer-1",
  "amount": 1650,
  "status": "Completed",
  "method": "UPI",
  "createdAt": "2026-01-20T10:30:00Z"
}
```

---

## Frontend Integration Steps

### 1. Store JWT Token After Login
Modify `Login.js` to store backend token:
```javascript
// After successful backend login
localStorage.setItem("accessToken", response.accessToken);
localStorage.setItem("registeredUser", JSON.stringify(response.user));
```

### 2. Use Token in API Calls
```javascript
const token = JSON.parse(localStorage.getItem("accessToken"));
const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`,
};

// Example: Fetch crops
const crops = await fetch("http://localhost:8081/api/crops", { headers });
```

### 3. Update Each Page

**Home.js** (Browse Crops)
```javascript
useEffect(() => {
  fetch("http://localhost:8081/api/crops")
    .then(r => r.json())
    .then(setCrops);
}, []);
```

**CropDetails.js** (View Crop)
```javascript
useEffect(() => {
  fetch(`http://localhost:8081/api/crops/${cropId}`)
    .then(r => r.json())
    .then(setCrop);
}, [cropId]);
```

**Chat.js** (Negotiate)
```javascript
// POST to create/get chat
const chat = await fetch("http://localhost:8081/api/chats", {
  method: "POST",
  headers,
  body: JSON.stringify({ dealerId }),
}).then(r => r.json());

// POST messages
await fetch(`http://localhost:8081/api/chats/${chatId}/message", {
  method: "POST",
  headers,
  body: JSON.stringify({ text }),
});

// POST confirm deal
await fetch(`http://localhost:8081/api/chats/${chatId}/confirm", {
  method: "POST",
  headers,
  body: JSON.stringify({ finalPrice, vehicle, pickup, drop }),
});
```

**Payment.js** (Place Order)
```javascript
// Already has dual-write; update to use token if present
const token = JSON.parse(localStorage.getItem("accessToken"));
if (token) {
  await fetch("http://localhost:8081/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });
}
```

**MyOrders.js** (View Orders)
```javascript
const token = JSON.parse(localStorage.getItem("accessToken"));
const orders = await fetch("http://localhost:8081/api/orders", {
  headers: { Authorization: `Bearer ${token}` },
}).then(r => r.json());
```

**SupportChat.js** (Complaints)
```javascript
// POST complaint
await fetch("http://localhost:8080/api/complaints", {
  method: "POST",
  headers,
  body: JSON.stringify({ orderId, severity, message }),
});

// GET complaint history
const complaints = await fetch("http://localhost:8081/api/complaints", {
  headers,
}).then(r => r.json());
```

---

## Data Models

### User (Customer)
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  passwordHash: String, // bcrypted
  role: "customer",
  status: "active" | "blocked" | "suspended",
  profile: {
    location: String,
    phone: String,
    avatarUrl: String,
  },
  createdAt: Date,
  updatedAt: Date,
}
```

### Crop
```javascript
{
  _id: ObjectId,
  farmerId: ObjectId, // ref User
  cropName: String,
  quantity: Number, // kg
  pricePerKg: Number,
  location: String, // pickup location
  description: String,
  images: [String], // URLs
  status: "listed" | "sold" | "hidden",
  createdAt: Date,
  updatedAt: Date,
}
```

### Order
```javascript
{
  _id: ObjectId,
  customerId: ObjectId,
  farmerId: ObjectId,
  dealerId: ObjectId,
  items: [{ cropId, cropName, quantity, pricePerKg, farmerName, farmerLocation }],
  delivery: { pickup, drop },
  transport: { dealerName, vehicle, price },
  summary: { itemsTotal, transportFee, platformFee, total },
  status: "Pending" | "Confirmed" | "In Transit" | "Delivered" | "Cancelled",
  paymentMethod: String,
  createdAt: Date,
}
```

### Chat
```javascript
{
  _id: ObjectId,
  customerId: ObjectId,
  dealerId: ObjectId,
  messages: [{ senderId, text, createdAt }],
  negotiation: { offeredPrice, finalPrice, vehicle, pickup, drop },
  confirmed: Boolean,
  confirmedAt: Date,
  createdAt: Date,
}
```

### Complaint
```javascript
{
  _id: ObjectId,
  customerId: ObjectId,
  orderId: ObjectId,
  severity: "High" | "Medium" | "Low",
  status: "Open" | "Resolved",
  message: String,
  resolutionNotes: String,
  createdAt: Date,
}
```

### Payment
```javascript
{
  _id: ObjectId,
  orderId: ObjectId,
  customerId: ObjectId,
  dealerId: ObjectId,
  amount: Number,
  platformFee: Number,
  dealerPayout: Number,
  status: "Pending" | "Completed" | "Failed",
  method: String,
  transactionRef: String,
  createdAt: Date,
}
```

---

## Migration Path (Phase)

**Phase 1: Dual-Write (Current)**
- Keep all localStorage reads/writes
- Backend receives data but frontend doesn't depend on it
- Status: Data flows to MongoDB for archival

**Phase 2: API-First Reads**
- Home.js reads crops from `GET /api/crops`
- MyOrders.js reads from `GET /api/orders` (fallback to localStorage)
- Status: Backend becomes source of truth for new data

**Phase 3: Complete Migration**
- Remove localStorage persistence for core entities
- Chat, complaints, payments all use API
- Status: MongoDB is single source of truth

---

## Running the Backend

```bash
cd server

# Install dependencies (already done)
npm install

# Set .env
# MONGODB_URI=mongodb+srv://user:pass@cluster/agrimart
# JWT_SECRET=your-secret-key
# CLIENT_ORIGIN=http://localhost:3000

# Run dev server
npm run dev
# API runs on http://localhost:8081
```

## Testing Endpoints (Curl/Postman)

```bash
# Health check
curl http://localhost:8081/api/health

# Register
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","password":"pass","role":"customer"}'

# Login
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"pass"}'

# Get crops (public)
curl http://localhost:8081/api/crops

# Get my orders (requires token)
curl -H "Authorization: Bearer <token>" http://localhost:8081/api/orders
```

---

*Last Updated: January 20, 2026*
