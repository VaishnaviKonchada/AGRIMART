# AgriMart Backend - Role-Based Authentication & Email Notifications

## Overview
This backend implements a comprehensive role-based authentication system with email notifications for user registration and login events. The system supports 4 user roles: **Customer**, **Farmer**, **Dealer**, and **Admin**.

## Features

### 1. Role-Based User Management
- **4 User Roles:**
  - `customer` - Buyers of agricultural products
  - `farmer` - Sellers of crops
  - `dealer` - Transport/logistics dealers
  - `admin` - System administrators

- **User Status:**
  - `active` - User can access the system
  - `blocked` - User access denied
  - `suspended` - Temporary suspension
  - `pending` - Email verification pending (optional enhancement)

### 2. Registration with Email Notification
When a user registers:
1. User provides: name, email, password, and role
2. System validates input and checks for duplicate email
3. Password is hashed using bcryptjs
4. User record is created in MongoDB
5. **Registration confirmation email is sent** containing:
   - Welcome message
   - Confirmed role (Customer/Farmer/Dealer/Admin)
   - Account ready to use

### 3. Login with Email Notification
When a user logs in:
1. System validates email and password
2. Checks user account status (active, blocked, suspended)
3. Generates JWT token (valid for 7 days)
4. **Login confirmation email is sent** containing:
   - Login role confirmation
   - Timestamp of login
   - Security warning

## API Endpoints

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Farmer",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "farmer"
}

Response (201):
{
  "message": "User registered successfully. Confirmation email sent.",
  "user": {
    "id": "67a1b2c3d4e5f6g7h8i9j0k1",
    "name": "John Farmer",
    "email": "john@example.com",
    "role": "farmer"
  }
}
```

### Login User
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}

Response (200):
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "67a1b2c3d4e5f6g7h8i9j0k1",
    "name": "John Farmer",
    "email": "john@example.com",
    "role": "farmer"
  }
}
```

## Setup Instructions

### 1. Install Dependencies
```bash
cd server
npm install
```

This adds `nodemailer` for email functionality.

### 2. Configure Gmail (Email Service)

#### Step 1: Enable 2-Factor Authentication
- Go to https://myaccount.google.com
- Click "Security" in the left panel
- Scroll down and enable "2-Step Verification"

#### Step 2: Generate App Password
- After 2FA is enabled, go back to Security page
- Find "App passwords"
- Select "Mail" and "Windows Computer" (or your OS)
- Google will generate a 16-character password

#### Step 3: Update `.env` file
```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_16_char_app_password
```

**Example:**
```env
EMAIL_USER=agrimart.support@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
```

### 3. Start the Server
```bash
npm run dev    # With nodemon (development)
npm start      # Production
```

## Middleware Usage

### Protect Routes with Authentication

```javascript
import { requireAuth, requireRole, requireRoles } from './middlewares/auth.js';

// Require any authenticated user
router.get('/profile', requireAuth, (req, res) => {
  res.json({ user: req.user }); // req.user = { sub: userId, role: 'farmer' }
});

// Require specific role
router.post('/crops', requireAuth, requireRole('farmer'), (req, res) => {
  // Only farmers can create crops
});

// Require multiple roles
router.get('/dashboard', requireAuth, requireRoles('admin', 'farmer'), (req, res) => {
  // Admins and farmers can access
});

// Optional authentication
router.get('/products', optionalAuth, (req, res) => {
  if (req.user) {
    // User is authenticated
  } else {
    // User is not authenticated
  }
});
```

## Email Templates

### Registration Email
- Subject: "Welcome to AgriMart - Registration Confirmed as [Role]"
- Contains:
  - Welcome greeting
  - Confirmed role
  - Login instructions
  - Security reminder

### Login Email
- Subject: "AgriMart - Login Successful as [Role]"
- Contains:
  - Confirmed role
  - Login timestamp
  - Security warning
  - Suspicious activity notice

## Error Handling

### Registration Errors
```
400 - Missing fields (name, email, password, role)
400 - Invalid role
409 - Email already registered
500 - Server error
```

### Login Errors
```
400 - Email or password missing
401 - Invalid credentials
403 - Account blocked/suspended
500 - Server error
```

## Security Features

1. **Password Hashing**: Using bcryptjs with salt rounds=10
2. **JWT Tokens**: Encrypted tokens with 7-day expiration
3. **Role-Based Access Control**: Fine-grained permissions
4. **Status Checking**: Blocked/suspended account detection
5. **Email Verification**: Notification of login events
6. **CORS Protection**: Restricted to allowed origins

## Database Schema

### User Model
```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique),
  passwordHash: String (required),
  role: String (enum: ['admin', 'farmer', 'customer', 'dealer'], default: 'customer'),
  status: String (enum: ['active', 'blocked', 'suspended', 'pending'], default: 'active'),
  profile: {
    location: String,
    phone: String,
    avatarUrl: String
  },
  createdAt: DateTime,
  updatedAt: DateTime
}
```

## Testing the Endpoints

### 1. Register a Farmer
```bash
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rajesh Kumar",
    "email": "rajesh@farm.com",
    "password": "Password@123",
    "role": "farmer"
  }'
```

### 2. Register a Customer
```bash
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Priya Singh",
    "email": "priya@customer.com",
    "password": "Password@123",
    "role": "customer"
  }'
```

### 3. Register a Dealer
```bash
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sharma Transport",
    "email": "sharma@dealer.com",
    "password": "Password@123",
    "role": "dealer"
  }'
```

### 4. Register an Admin
```bash
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@agrimart.com",
    "password": "AdminPass@123",
    "role": "admin"
  }'
```

### 5. Login
```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rajesh@farm.com",
    "password": "Password@123"
  }'
```

## Email Service Troubleshooting

If emails are not sending:

1. **Check EMAIL_USER and EMAIL_PASSWORD in .env**
   - Ensure they are correctly set
   - No extra spaces

2. **Verify Gmail App Password**
   - Generate new one at https://myaccount.google.com/apppasswords
   - Use exact 16-character password

3. **Check Console Logs**
   - Look for "Email service ready" message on startup
   - Check error messages for email failures

4. **Test Email Manually** (Optional fallback)
   - In development, emails can fail silently
   - Application continues to work
   - User registration/login still succeeds

## Next Steps

After this setup:
1. Frontend will call `/api/auth/register` and `/api/auth/login`
2. Users will receive confirmation emails
3. JWT tokens will be stored in localStorage
4. Protected routes will use `requireAuth` middleware
5. Role-specific features can use `requireRole` or `requireRoles`

## Frontend Integration

### Register
```javascript
const response = await fetch('http://localhost:8081/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: formData.name,
    email: formData.email,
    password: formData.password,
    role: formData.role // 'customer', 'farmer', 'dealer', 'admin'
  })
});
```

### Login
```javascript
const response = await fetch('http://localhost:8081/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: formData.email,
    password: formData.password
  })
});

const data = await response.json();
localStorage.setItem('accessToken', data.accessToken);
localStorage.setItem('user', JSON.stringify(data.user));
```

### Protected API Calls
```javascript
const response = await fetch('http://localhost:8081/api/protected-route', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
});
```

---

**Created**: January 2026  
**Maintained by**: AgriMart Development Team
