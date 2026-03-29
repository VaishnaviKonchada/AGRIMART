# Agrimart Server (Node + MongoDB)

## Prerequisites
- Node.js LTS
- MongoDB Atlas connection string

## Setup
1. Copy `.env.example` to `.env` and fill values.
2. Install packages:
```
npm install
```
3. Run in dev:
```
npm run dev
```

## Endpoints
- GET `/api/health` → basic health check
- POST `/api/auth/register` → create user
- POST `/api/auth/login` → returns `accessToken`
- GET/POST `/api/orders` → list/create orders (requires `Authorization: Bearer <token>`)

**API runs on `http://localhost:8081`**

## CORS
Set `CLIENT_ORIGIN` in `.env` (e.g., `http://localhost:3000`).

## Notes
- Server starts even if `MONGODB_URI` is missing (for setup). DB operations require the URI.
- Minimal models/routes included; extend with dealers, complaints, payments, chat.
