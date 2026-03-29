# AgriMart Backend - Complete Implementation Guide

## What Has Been Implemented

### ✅ 1. Role-Based Authentication System
- 4 User Roles: `customer`, `farmer`, `dealer`, `admin`
- User Status Management: `active`, `blocked`, `suspended`, `pending`
- JWT Token Generation (7-day expiration)
- Password Hashing with bcryptjs (10 salt rounds)

### ✅ 2. Email Notification Service
- **Registration Email**: Sent automatically after successful registration
- **Login Email**: Sent automatically after successful login
- Beautiful HTML email templates with branding
- Role-specific confirmation messages

### ✅ 3. Role-Specific Routes

#### Farmer Routes (`/api/farmer`)
- `GET /api/farmer/dashboard` - View farmer dashboard
- `GET /api/farmer/profile` - Get farmer profile
- `PUT /api/farmer/profile` - Update profile (phone, location, avatar)

#### Customer Routes (`/api/customer`)
- `GET /api/customer/dashboard` - View customer dashboard
- `GET /api/customer/profile` - Get customer profile
- `PUT /api/customer/profile` - Update profile (phone, location, avatar)

#### Dealer Routes (`/api/dealer`)
- `GET /api/dealer/dashboard` - View dealer dashboard
- `GET /api/dealer/profile` - Get dealer profile
- `PUT /api/dealer/profile` - Update profile (phone, location, avatar)

#### Admin Routes (`/api/admin`)
- `GET /api/admin/dashboard` - View admin dashboard with statistics
- `GET /api/admin/users` - List all users with filtering
- `PUT /api/admin/users/:userId/status` - Change user status
- `DELETE /api/admin/users/:userId` - Delete user
- `GET /api/admin/profile` - Get admin profile

### ✅ 4. Authentication Middleware
- `requireAuth` - Protects routes (requires valid JWT)
- `requireRole(role)` - Requires specific role
- `requireRoles(...roles)` - Requires one of multiple roles
- `optionalAuth` - Optional authentication

### ✅ 5. Security Features
- CORS Protection
- Helmet for HTTP headers
- JWT Token Validation
- Password Hashing
- Status-based Access Control
- Environment-based Configuration

---

## File Structure

```
server/
├── src/
│   ├── config/
│   │   └── db.js
│   ├── middlewares/
│   │   └── auth.js (Enhanced with role-based middleware)
│   ├── models/
│   │   └── User.js (Includes role and status fields)
│   ├── routes/
│   │   ├── auth.js (Updated with email notifications)
│   │   ├── farmer.js (NEW)
│   │   ├── customer.js (NEW)
│   │   ├── dealer.js (NEW)
│   │   ├── admin.js (NEW)
│   │   ├── orders.js
│   │   ├── crops.js
│   │   ├── chats.js
│   │   ├── complaints.js
│   │   └── payments.js
│   ├── services/
│   │   └── emailService.js (NEW - Email handling)
│   └── index.js (Updated with new routes)
├── .env (Updated with email config)
├── AUTHENTICATION_GUIDE.md (NEW - Full documentation)
├── package.json (Updated with nodemailer)
└── README.md
```

---

## Setup Instructions

### Step 1: Install Dependencies
```bash
cd server
npm install nodemailer
```

### Step 2: Configure Gmail Email Service

#### 2.1 Enable 2-Factor Authentication
1. Go to https://myaccount.google.com
2. Click "Security" in the left navigation
3. Scroll to "2-Step Verification" and enable it

#### 2.2 Generate App Password
1. After enabling 2FA, go back to Security page
2. Scroll to "App passwords"
3. Select:
   - App: "Mail"
   - Device: "Windows Computer" (or your OS)
4. Google generates a 16-character password

#### 2.3 Update `.env` File
```env
PORT=8081
MONGODB_URI=mongodb://localhost:27017/agrimart
JWT_SECRET=agrimart_super_secret_key_12345
CLIENT_ORIGIN=http://localhost:3000

# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
```

**Example:**
```env
EMAIL_USER=agrimart.support@gmail.com
EMAIL_PASSWORD=bcde fghi jklm nopq
```

### Step 3: Start Server
```bash
npm run dev    # Development (with nodemon)
npm start      # Production
```

Expected output:
```
Email service ready
MongoDB connected
API running on :8081
```

---

## API Usage Examples

### 1. Register User

#### Register as Farmer
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

**Response (201):**
```json
{
  "message": "User registered successfully. Confirmation email sent.",
  "user": {
    "id": "67a1b2c3d4e5f6g7h8i9j0k1",
    "name": "Rajesh Kumar",
    "email": "rajesh@farm.com",
    "role": "farmer"
  }
}
```

#### Register as Customer
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

#### Register as Dealer
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

#### Register as Admin
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

### 2. Login

```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rajesh@farm.com",
    "password": "Password@123"
  }'
```

**Response (200):**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "67a1b2c3d4e5f6g7h8i9j0k1",
    "name": "Rajesh Kumar",
    "email": "rajesh@farm.com",
    "role": "farmer"
  }
}
```

### 3. Access Protected Routes

#### Farmer Dashboard
```bash
curl -X GET http://localhost:8081/api/farmer/dashboard \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "message": "Farmer Dashboard",
  "farmer": {
    "id": "67a1b2c3d4e5f6g7h8i9j0k1",
    "name": "Rajesh Kumar",
    "email": "rajesh@farm.com",
    "profile": {
      "location": "",
      "phone": "",
      "avatarUrl": ""
    }
  }
}
```

#### Farmer Profile
```bash
curl -X GET http://localhost:8081/api/farmer/profile \
  -H "Authorization: Bearer {token}"
```

#### Update Farmer Profile
```bash
curl -X PUT http://localhost:8081/api/farmer/profile \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+91-9876543210",
    "location": "Maharashtra, India",
    "avatarUrl": "https://example.com/avatar.jpg"
  }'
```

#### Customer Dashboard
```bash
curl -X GET http://localhost:8081/api/customer/dashboard \
  -H "Authorization: Bearer {token}"
```

#### Dealer Dashboard
```bash
curl -X GET http://localhost:8081/api/dealer/dashboard \
  -H "Authorization: Bearer {token}"
```

### 4. Admin-Only Operations

#### Get Dashboard with Statistics
```bash
curl -X GET http://localhost:8081/api/admin/dashboard \
  -H "Authorization: Bearer {admin_token}"
```

**Response:**
```json
{
  "message": "Admin Dashboard",
  "admin": {
    "id": "67a1b2c3d4e5f6g7h8i9j0k1",
    "name": "Admin User",
    "email": "admin@agrimart.com"
  },
  "statistics": {
    "totalUsers": 15,
    "farmers": 5,
    "customers": 8,
    "dealers": 1,
    "admins": 1,
    "activeUsers": 14,
    "blockedUsers": 1
  }
}
```

#### Get All Users
```bash
curl -X GET "http://localhost:8081/api/admin/users?role=farmer&page=1&limit=10" \
  -H "Authorization: Bearer {admin_token}"
```

#### Block a User
```bash
curl -X PUT http://localhost:8081/api/admin/users/67a1b2c3d4e5f6g7h8i9j0k1/status \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"status": "blocked"}'
```

#### Unblock a User
```bash
curl -X PUT http://localhost:8081/api/admin/users/67a1b2c3d4e5f6g7h8i9j0k1/status \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

#### Delete a User
```bash
curl -X DELETE http://localhost:8081/api/admin/users/67a1b2c3d4e5f6g7h8i9j0k1 \
  -H "Authorization: Bearer {admin_token}"
```

---

## Email Templates

### Registration Email
- **Subject**: "Welcome to AgriMart - Registration Confirmed as [Role]"
- **Contains**:
  - Personalized greeting with name
  - Confirmed role (Farmer/Customer/Dealer/Admin)
  - Ready to use message
  - Company branding

### Login Email
- **Subject**: "AgriMart - Login Successful as [Role]"
- **Contains**:
  - Confirmed role
  - Login timestamp
  - Security warning
  - Account protection reminder

---

## Frontend Integration

### Register Component (No Changes Needed)
The frontend can continue using the existing registration form. Just ensure it sends the `role` field:

```javascript
const handleRegister = async (formData) => {
  const response = await fetch('http://localhost:8081/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role  // 'customer', 'farmer', 'dealer', 'admin'
    })
  });
  
  const data = await response.json();
  if (response.ok) {
    alert('Registration successful! Check your email.');
    // Redirect to login
  }
};
```

### Login Component (No Changes Needed)
```javascript
const handleLogin = async (email, password) => {
  const response = await fetch('http://localhost:8081/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  if (response.ok) {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    // Redirect based on role
  }
};
```

### Protected API Calls (No Changes Needed)
```javascript
const fetchProtectedData = async () => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch('http://localhost:8081/api/farmer/dashboard', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  console.log(data);
};
```

---

## Error Responses

### 400 - Bad Request
```json
{
  "message": "Missing required fields: name, email, password, role"
}
```

### 401 - Unauthorized
```json
{
  "message": "Invalid credentials"
}
```

### 403 - Forbidden (Wrong Role)
```json
{
  "message": "Access denied. Required role: farmer"
}
```

### 403 - Account Blocked
```json
{
  "message": "Your account has been blocked"
}
```

### 409 - Email Already Registered
```json
{
  "message": "Email already registered"
}
```

### 500 - Server Error
```json
{
  "message": "Server error during registration"
}
```

---

## Troubleshooting

### Email Not Sending?
1. **Check .env file**: Verify `EMAIL_USER` and `EMAIL_PASSWORD` are set
2. **Check console**: Look for "Email service ready" message on startup
3. **Verify App Password**: Make sure you generated it correctly from Google Account
4. **Check SMTP**: Try creating a test email with nodemailer
5. **Logs**: Check for error messages in server console

### Token Invalid?
1. Make sure token is included with `Bearer ` prefix
2. Check token hasn't expired (7 days)
3. Verify `JWT_SECRET` in .env matches server

### Role Access Denied?
1. Verify user's role in MongoDB
2. Check role in JWT token payload
3. Make sure route requires correct role

### MongoDB Connection Failed?
1. Check MONGODB_URI in .env
2. Verify MongoDB is running: `mongod`
3. Test connection: `mongodb://localhost:27017/agrimart`

---

## Database Schema (User)

```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique),
  passwordHash: String (required),
  role: String (enum: ['admin', 'farmer', 'customer', 'dealer']),
  status: String (enum: ['active', 'blocked', 'suspended', 'pending']),
  profile: {
    location: String,
    phone: String,
    avatarUrl: String
  },
  createdAt: DateTime,
  updatedAt: DateTime
}
```

---

## Next Steps

1. **Update Frontend**: Ensure registration form includes `role` field
2. **Test Each Role**: Register and login as each role type
3. **Check Emails**: Verify registration and login emails arrive
4. **Add Features**: Build role-specific dashboards in frontend
5. **Extend Admin**: Add more admin management features as needed

---

## Support

For issues or questions:
1. Check error logs in server console
2. Review AUTHENTICATION_GUIDE.md for detailed docs
3. Test endpoints with provided curl examples
4. Verify .env configuration

---

**Version**: 1.0  
**Created**: January 2026  
**Maintained by**: AgriMart Development Team
