# User Account Architecture & Data Flow

## Current Issue (What Was Happening)

```
❌ WRONG - Same Email for All Roles

┌─────────────────────────────────────────────────────────┐
│                  BROWSER (Frontend)                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Account Page 1 (Customer)        Account Page 2 (Farmer)│
│  ├─ localStorage.accessToken      ├─ localStorage.accessToken
│  └─ Shows "Vennela" ❌            └─ Shows "Vennela" ❌
│                                                           │
│  Both pointing to same JWT token!                        │
│  JWT = { sub: "Vennela_ID", role: "admin" }             │
│                                                           │
└──────────────────────────┬──────────────────────────────┘
                          │ GET /api/users/me
                          │ Authorization: Bearer token
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (Express)                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  JWT Middleware:                                         │
│  ├─ Extract userId from JWT: "Vennela_ID"              │
│  └─ Set req.user = { sub: "Vennela_ID", role: "admin" }│
│                                                           │
│  User Route (/api/users/me):                            │
│  └─ User.findById("Vennela_ID")                         │
│     └─ Returns SAME USER for both pages! ❌             │
│                                                           │
└──────────────────────────┬──────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  DATABASE (MongoDB)                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  User Collection:                                        │
│  └─ { _id: "Vennela_ID",                                │
│       name: "Vennela",                                   │
│       email: "vennela79@gmail.com",                      │
│       role: "admin" }                                    │
│                                                           │
│  ❌ NO OTHER USERS! (Same email can't be registered)    │
│                                                           │
└─────────────────────────────────────────────────────────┘

Result: Customer & Farmer pages both show "Vennela" ❌
```

---

## Correct Implementation (With Different Emails)

```
✅ RIGHT - Different Email per Role

┌─────────────────────────────────────────────────────────┐
│                  BROWSER (Frontend)                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Customer Page              Farmer Page                  │
│  ├─ Token A                 ├─ Token B                   │
│  │  {sub: Customer_ID}      │  {sub: Farmer_ID}         │
│  └─ Shows "Priya" ✅        └─ Shows "Raj" ✅           │
│                                                           │
│  DIFFERENT tokens for DIFFERENT users!                  │
│                                                           │
└──────────────────────────┬──────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   Token A          Token B           Token C
  (Customer)       (Farmer)          (Dealer)
        │                 │                 │
        ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (Express)                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Request 1: GET /api/users/me (Token A)                │
│  ├─ Extract: req.user.sub = Customer_ID                │
│  └─ Query: User.findById(Customer_ID)                  │
│     └─ Return: "Priya" ✅                               │
│                                                           │
│  Request 2: GET /api/users/me (Token B)                │
│  ├─ Extract: req.user.sub = Farmer_ID                  │
│  └─ Query: User.findById(Farmer_ID)                    │
│     └─ Return: "Raj" ✅                                 │
│                                                           │
└──────────────────────────┬──────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  DATABASE (MongoDB)                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  User Collection:                                        │
│                                                           │
│  User 1:                                                 │
│  { _id: "Customer_ID",                                   │
│    name: "Priya",                                        │
│    email: "customer.priya@gmail.com",                   │
│    role: "customer" }                                    │
│                                                           │
│  User 2:                                                 │
│  { _id: "Farmer_ID",                                     │
│    name: "Raj",                                          │
│    email: "farmer.raj@gmail.com",                       │
│    role: "farmer" }                                      │
│                                                           │
│  User 3:                                                 │
│  { _id: "Dealer_ID",                                     │
│    name: "Sai",                                          │
│    email: "dealer.sai@gmail.com",                       │
│    role: "dealer" }                                      │
│                                                           │
│  ✅ UNIQUE EMAILS, UNIQUE USERS, UNIQUE DATA!          │
│                                                           │
└─────────────────────────────────────────────────────────┘

Result: Each user sees their own name ✅
```

---

## Registration Flow - Key Difference

### ❌ Wrong Way (Same Email)
```
Registration Attempt 1 - Admin
├─ Email: vennela79@gmail.com
├─ Name: Vennela
├─ Role: admin
└─ ✅ Succeeds → User created

Registration Attempt 2 - Farmer
├─ Email: vennela79@gmail.com ❌ SAME EMAIL!
├─ Name: FarmerName
├─ Role: farmer
└─ ❌ FAILS: "Email already registered"

Result: Only Admin exists, Farmer registration rejected
```

### ✅ Right Way (Different Emails)
```
Registration Attempt 1 - Admin
├─ Email: vennela79@gmail.com
├─ Name: Vennela
├─ Role: admin
└─ ✅ Succeeds → User 1 created

Registration Attempt 2 - Farmer
├─ Email: farmer.raj@gmail.com ✅ DIFFERENT EMAIL
├─ Name: Raj
├─ Role: farmer
└─ ✅ Succeeds → User 2 created

Registration Attempt 3 - Customer
├─ Email: customer.priya@gmail.com ✅ DIFFERENT EMAIL
├─ Name: Priya
├─ Role: customer
└─ ✅ Succeeds → User 3 created

Result: Three separate users with unique emails and names
```

---

## Email Uniqueness Constraint

```
MongoDB Schema:
email: { 
  type: String, 
  required: true, 
  unique: true  ← This enforces uniqueness
}

What This Means:
✅ Can have: user1@gmail.com, user2@gmail.com, user3@gmail.com
❌ Cannot have: user@gmail.com, user@gmail.com (duplicate)

How Backend Enforces It:
1. User registers with email
2. Backend checks: db.users.find({ email })
3. If email exists → Error: "Email already registered"
4. If not exists → Insert new user document
```

---

## Solution Summary

```
THE GOLDEN RULE:
═════════════════════════════════════════════════════════

🔐 Each User = Unique Email = Unique Account = Own Data

Customer: customer@gmail.com → Sees Customer name
Farmer:   farmer@gmail.com   → Sees Farmer name
Dealer:   dealer@gmail.com   → Sees Dealer name
Admin:    admin@gmail.com    → Sees Admin name

✅ NOT:
Customer: vennela@gmail.com ❌
Farmer:   vennela@gmail.com ❌ (Duplicate!)
═════════════════════════════════════════════════════════
```

---

## How System Works (When Correct)

```
LOGIN FLOW
──────────

1. User clicks Login
2. Enters: Email (farmer.raj@gmail.com) + Password
3. Backend: 
   ├─ Find user by email
   ├─ Verify password with bcrypt
   └─ Create JWT: { sub: <farmer-id>, role: "farmer" }
4. JWT Token stored in localStorage
5. Sent with every API request: Authorization: Bearer JWT

ACCOUNT PAGE FLOW
──────────────────

1. Page loads
2. Reads: localStorage.accessToken (JWT)
3. Fetches: GET /api/users/me with token
4. Backend:
   ├─ Decrypt JWT
   ├─ Extract userId
   ├─ Query: User.findById(userId)
   └─ Return THAT user's data
5. Page displays: user.name ("Raj"), user.email, etc.

SWITCHING USERS
─────────────────

1. User A logs in → Token A (user A's ID)
2. Use app as User A → Shows User A's name
3. User A clicks Logout
4. localStorage Token A deleted
5. User B logs in → Token B (user B's ID)
6. Use app as User B → Shows User B's name ← DIFFERENT!
```

---

## Key Code Components

```javascript
// LOGIN - Gets user credentials
const response = await fetch('/api/auth/login', {
  body: { email, password }
});
// Returns: { accessToken: JWT, user: {...} }

// STORE TOKEN
localStorage.setItem('accessToken', JWT);

// FETCH PROFILE - Uses token to identify user
const response = await fetch('/api/users/me', {
  headers: { Authorization: `Bearer ${JWT}` }
});
// Backend extracts: req.user.sub = userId
// Queries: User.findById(userId)
// Returns: THAT user's data

// DISPLAY - Shows the fetched user's data
<div>{userData.name}</div> 
// Shows the name of whichever user's token was used
```

The system is designed perfectly for user isolation. It just needs **different emails per user** to create separate user documents! 🚀
