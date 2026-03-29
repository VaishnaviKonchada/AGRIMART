# Agrimart Backend Guide

This guide proposes a pragmatic backend for Agrimart that mirrors the current frontend flows (localStorage-based) and prepares the project for multi-role production use: Admin, Farmer, Customer, Transport Dealer.

## Architecture Overview

- Runtime: Node.js (LTS) + Express (REST API)
- Auth: JWT + refresh tokens; role-based access (admin, farmer, customer, dealer)
- DB: MongoDB (Atlas) with Mongoose (documents align well with existing JSON shapes)
  - Alternative: PostgreSQL + Prisma if you prefer relational schemas
- Realtime: Socket.IO for Chat, Delivery Tracking, Notifications
- Validation: Zod or Joi for request schemas
- Security: bcrypt for passwords, CORS, helmet, rate limiting
- Observability: request logging (morgan), basic metrics (Prometheus-ready later)
- Deployment: Render/Railway for API, MongoDB Atlas for DB

## Collections & Schemas (MongoDB)

- User
  - id, name, email, passwordHash, role: ['admin','farmer','customer','dealer']
  - status: ['active','blocked','suspended','pending']
  - profile: { location, phone, avatarUrl, ... }
  - timestamps
- Crop
  - id, farmerId (User), cropName, quantityKg, pricePerKg, location, description, images[]
  - status: ['listed','sold','hidden']
  - timestamps
- Dealer
  - id, companyName, contactName, email, serviceLocations[], vehicles[] ('BIKE','AUTO','TRUCK')
  - basePrice, rating, status: ['approved','pending','suspended']
  - metrics: { trips, earnings, cancellations }
  - timestamps
- Order
  - id, customerId, farmerId, dealerId
  - items: [{ cropId, cropName, quantity, pricePerKg, farmerName, farmerLocation }]
  - delivery: { pickup: farmerLocation, drop: string }
  - transport: { dealerName, vehicle, price }
  - summary: { itemsTotal, transportFee, platformFee, total }
  - status: ['Pending','Confirmed','In Transit','Delivered','Cancelled']
  - paymentMethod: 'UPI' | 'CARD' | 'COD'
  - createdAt
- Payment
  - id, orderId, amount, platformFee, dealerPayout, status: ['Pending','Completed','Failed']
  - method, transactionRef
  - timestamps
- Complaint
  - id, userId, orderId, severity: ['High','Medium','Low'], status: ['Open','Resolved']
  - message, resolutionNotes, timestamps
- Chat
  - id, participants: { customerId, dealerId } (optionally farmerId)
  - messages: [{ senderId, text, ts }]
  - negotiation: { offeredPrice, finalPrice, vehicle, pickup, drop }
  - confirmed: boolean, confirmedAt

## REST API (Draft)

Base path: `/api`

Auth
- POST `/auth/register` { name, email, password, role }
- POST `/auth/login` { email, password } → { accessToken, refreshToken, user }
- GET `/auth/me` (auth)
- POST `/auth/refresh` { refreshToken }
- POST `/auth/logout` (invalidate refresh)

Farmers
- GET `/farmers` (admin)
- GET `/farmers/:id` (admin/self)
- PATCH `/farmers/:id/status` { status } (admin)
- GET `/farmers/:id/crops`

Customers
- GET `/customers` (admin)
- GET `/customers/:id` (admin/self)
- PATCH `/customers/:id/block` { blocked: boolean } (admin)

Dealers
- GET `/dealers` (admin)
- GET `/dealers/:id`
- PATCH `/dealers/:id/approve` (admin)
- PATCH `/dealers/:id/suspend` (admin)
- GET `/dealers/:id/metrics` (admin)

Crops
- GET `/crops` (public)
- POST `/crops` (farmer): create crop listing
- PATCH `/crops/:id` (farmer)
- DELETE `/crops/:id` (farmer)

Orders
- GET `/orders` (scoped to requester role: customer sees their orders; admin sees all)
- POST `/orders` (customer): body structured to match current frontend order object
- GET `/orders/:id`
- PATCH `/orders/:id/status` { status } (admin/dealer)

Payments
- POST `/payments/intent` { orderId, amount } → provider intent (mock or integrate gateway)
- POST `/payments/settlement` { orderId } (admin): compute 5% platform fee
- GET `/payments/summary` (admin)

Complaints
- GET `/complaints` (admin)
- POST `/complaints` (any logged-in user)
- PATCH `/complaints/:id` { status, resolutionNotes } (admin)

Chat & Negotiation
- REST:
  - POST `/chats` { dealerId } (customer)
  - GET `/chats/:id`
  - POST `/chats/:id/message` { text } (participants)
  - POST `/chats/:id/confirm` { finalPrice, vehicle, pickup, drop }
- Socket.IO (namespace `/chat`):
  - `join_room` { chatId }
  - `message` { chatId, text }
  - `negotiation_update` { chatId, payload }
  - `deal_confirmed` { chatId, finalPrice }

Utility (optional)
- GET `/translate`?q=...&from=xx&to=yy` (server-side proxy/caching for MyMemory API used in AddCrop)

## Mapping from localStorage → Backend

Current keys seen in frontend/docs:
- `cartItems` → use `/carts` (optional) or include in `POST /orders`
- `selectedDealer`, `finalPrice` → stored in `Chat.negotiation` and referenced when creating orders
- `orders` → persist in `Order` collection; fetch via `GET /orders`
- Admin data seeds: `farmers`, `customers`, `dealers`, `deliveries`, `complaints`, `adminProfile` → replace with DB collections and `GET` endpoints

Migration approach:
1. Phase 1 (dual-write): keep localStorage; on actions also `POST` to API.
2. Phase 2 (server-source-of-truth): read from API and fallback to localStorage if offline.
3. Phase 3: remove localStorage persistence for core entities.

## Auth & RBAC

- Access token (JWT) embeds `sub`, `role`
- Middlewares:
  - `requireAuth`
  - `requireRole('admin'|'farmer'|'customer'|'dealer')`
- Route protections mirror frontend `RequireRole`
- Passwords hashed with bcrypt; refresh tokens stored (revocation list or DB)

## Realtime Features

- Chat: Socket.IO rooms per `chatId`
- Delivery tracking: dealer emits updates (`location`, `status`); customer subscribes to order channel `/orders/:id`
- Admin notifications: namespaces `/admin` for complaints/orders status changes

## Payments

- Start simple: mock intents and status transitions to match UI
- Fee calculation: platform fee = 5% → $\text{fee} = 0.05 \times \text{itemsTotal}$
- Later integrate gateway (Razorpay/Stripe/Paytm): server creates intent, webhook updates `Payment` and `Order` status

## Environment & Config

`.env` (server):
- `PORT=8081`
- `MONGODB_URI=`
- `JWT_SECRET=`
- `JWT_REFRESH_SECRET=`
- `CLIENT_ORIGIN=http://localhost:3000`

CORS: allow client origin; credentials for refresh route if using cookies

## Project Structure (server)

```
server/
  package.json
  src/
    index.ts
    config/
    middlewares/
    modules/
      auth/
      users/
      farmers/
      customers/
      dealers/
      crops/
      orders/
      payments/
      complaints/
      chat/
    utils/
```

## Endpoint Contracts (Examples)

Create Order (customer)
```
POST /api/orders
{
  "items": [
    { "cropId": "...", "cropName": "Tomato", "quantity": 5, "pricePerKg": 200, "farmerName": "John", "farmerLocation": "Rajahmundry" }
  ],
  "delivery": { "drop": "Vijayawada" },
  "transport": { "dealerId": "...", "dealerName": "City Auto Logistics", "vehicle": "AUTO", "price": 600 },
  "paymentMethod": "UPI"
}
→ 201 Created
{ "id": "...", "status": "Confirmed", "summary": { "itemsTotal": 1150, "transportFee": 600, "platformFee": 50, "total": 1800 } }
```

Confirm Deal (chat)
```
POST /api/chats/:id/confirm
{ "finalPrice": 600, "vehicle": "AUTO", "pickup": "Rajahmundry", "drop": "Vijayawada" }
→ stores negotiation + emits `deal_confirmed`
```

Admin: Approve Dealer
```
PATCH /api/dealers/:id/approve
→ status: "approved"
```

## Deployment Notes

- API: Render/Railway free tier to start; enable autosleep
- DB: MongoDB Atlas (M0) with IP allowlist and user credentials
- Env vars set in host
- CI/CD: GitHub Actions with lint + test + deploy triggers

## Next Steps

1. Decide stack (Mongo vs Postgres)
2. Scaffold `server/` and implement `auth`, `users`, `crops`
3. Wire `POST /orders` from Payment page; dual-write to localStorage + API
4. Introduce Socket.IO for Chat confirmation
5. Migrate Admin pages to read from API endpoints

If you want, I can scaffold a minimal Express server in `server/` with these modules to get you started.
