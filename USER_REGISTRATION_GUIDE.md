# User Registration & Account Separation Guide

## ⚠️ CRITICAL ISSUE IDENTIFIED

**Problem**: All account pages are showing the same name "Vennela" because they're all using the same email address.

**Root Cause**: MongoDB enforces **unique email addresses**. You cannot have multiple users (customer, farmer, admin) with the same email.

---

## ✅ SOLUTION: Use Different Emails

Each user role MUST have a **different email address**. Here's the correct way to test:

### Example Setup for Testing

```
Admin User:
  - Email: vennela79@gmail.com
  - Name: Vennela
  - Role: Admin
  - Password: Admin@12345

Farmer User:
  - Email: farmer.vennela@gmail.com
  - Name: Farmer Vennela (or different name)
  - Role: Farmer
  - Password: Farmer@12345

Customer User:
  - Email: customer.vennela@gmail.com
  - Name: Customer Vennela (or different name)
  - Role: Customer
  - Password: Customer@12345

Transport Dealer User:
  - Email: dealer.vennela@gmail.com
  - Name: Dealer Vennela
  - Role: Transport Dealer
  - Password: Dealer@12345
```

---

## 📝 Step-by-Step Registration

### 1. Register Admin (if not exists)
```
1. Go to /register
2. Full Name: Vennela
3. Role: Admin
4. Email: vennela79@gmail.com ✓ (your existing admin)
5. Password: Admin@12345 (or your current password)
6. Fill location details
7. Click Register
```

### 2. Register Farmer
```
1. Go to /register
2. Full Name: Farmer Test (or your farmer's name)
3. Role: Farmer (select this!)
4. Email: farmer.test@gmail.com ✓ DIFFERENT EMAIL!
5. Password: Farmer@12345
6. Fill same location (Andhra Pradesh preferred)
7. Click Register
8. Log in with farmer email
```

### 3. Register Customer
```
1. Go to /register
2. Full Name: Customer Test (or your customer's name)
3. Role: Customer (select this!)
4. Email: customer.test@gmail.com ✓ DIFFERENT EMAIL!
5. Password: Customer@12345
6. Fill same location
7. Click Register
8. Log in with customer email
```

### 4. Verify It Works
```
Login as Farmer → /farmer/account should show "Farmer Test"
Login as Customer → /account should show "Customer Test"
Login as Admin → /admin/account should show "Vennela"
```

---

## 🔧 Backend Validation

The backend enforces email uniqueness at these points:

1. **Registration** (`/api/auth/register`)
   ```javascript
   const existing = await User.findOne({ email });
   if (existing) {
     return 409 'Email already registered'
   }
   ```

2. **User Model** (MongoDB)
   ```javascript
   email: { type: String, required: true, unique: true }
   ```

---

## 🚨 Common Mistakes

❌ **WRONG**: Trying to register multiple roles with same email
```
Customer: vennela79@gmail.com ✗ Duplicate
Farmer: vennela79@gmail.com ✗ Duplicate
```

✅ **CORRECT**: Using different emails for each user
```
Customer: customer@gmail.com ✓ Unique
Farmer: farmer@gmail.com ✓ Unique
```

---

## 📊 What Gets Stored

When you register, the system saves:

```javascript
User Document:
{
  _id: "ObjectID",
  name: "Farmer Test",           // Your registration name
  email: "farmer.test@gmail.com", // MUST BE UNIQUE
  role: "farmer",                // Your selected role
  passwordHash: "encrypted...",
  profile: {
    country: "India",
    state: "Andhra Pradesh",
    district: "...",
    mandal: "...",
    doorNo: "...",
    pincode: "...",
    locationText: "..."
  }
}
```

---

## 🔐 JWT Token Flow

1. **Login** with email → Backend verifies password
2. **Backend sends** JWT token containing `{ sub: userId, role: userRole }`
3. **Frontend stores** accessToken in localStorage
4. **Account page** fetches from `/api/users/me` using the token
5. **Backend uses** JWT to identify which user (by _id) and returns THEIR data

**Key Point**: Each user has a different `_id`, so `/api/users/me` returns THEIR specific data.

---

## ✨ Test Account Suggestions

Use Gmail's alias feature if you want to use one email:
- `gmail+customer@email.com`
- `gmail+farmer@email.com`
- `gmail+dealer@email.com`

Or use completely different emails from different email providers.

---

## 📋 Checklist

Before reporting issues, verify:

- [ ] Each user registered with **different email**
- [ ] Each user has unique name in registration form
- [ ] Frontend shows role description when role is selected
- [ ] Password meets requirements (8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
- [ ] Location fields are filled for each user
- [ ] Registration succeeds (email not already in use)
- [ ] Login with correct email for that role
- [ ] Account page shows that user's name (not "Vennela")

---

## 🐛 If Still Having Issues

If after using different emails you still see wrong names:
1. Check browser console for errors
2. Clear localStorage: Open DevTools → Application → localStorage → Clear All
3. Close and reopen browser
4. Try again with fresh registration

These steps ensure fresh JWT tokens and cached data is cleared.
