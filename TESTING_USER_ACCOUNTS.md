# Quick Testing Checklist: User Account Separation

## Before You Start
- [ ] Clear browser localStorage (DevTools → Application → localStorage → Clear All)
- [ ] Make sure backend server is running on port 8081
- [ ] Have the app loaded in browser on localhost:3000

## Registration Test Flow

### Create Farmer Account
```
Step 1: Go to /register
Step 2: Fill form:
  Full Name:     → Farmer Raj
  Role:          → 👨‍🌾 Farmer (Sell Crops)
  Email:         → farmer.raj@gmail.com ✓ UNIQUE
  Password:      → FarmerRaj@123
  Country:       → India
  State:         → Andhra Pradesh
  District:      → Chittoor
  Mandal:        → Tirupati
  Door No:       → 101
  Location:      → Use 📍 button or type
  Pincode:       → 517501
Step 3: Click Register
Step 4: Should see "Registered Successfully ✅"
Step 5: Click Login in banner
```

### Create Customer Account
```
Step 1: Go to /register (fresh page)
Step 2: Fill form:
  Full Name:     → Customer Priya
  Role:          → 🛒 Customer (Buy Crops)
  Email:         → customer.priya@gmail.com ✓ DIFFERENT
  Password:      → CustomerPriya@123
  Country:       → India
  State:         → Andhra Pradesh
  District:      → Chittoor
  Mandal:        → Tirupati
  Door No:       → 102
  Location:      → Use 📍 button
  Pincode:       → 517501
Step 3: Click Register
Step 4: Should see "Registered Successfully ✅"
```

### Create Transport Dealer Account (Optional)
```
Step 1: Go to /register
Step 2: Fill form:
  Full Name:     → Dealer Sai
  Role:          → 🚚 Transport Dealer
  Email:         → dealer.sai@gmail.com ✓ UNIQUE
  Password:      → DealerSai@123
  ... (fill location same as above)
Step 3: Click Register
```

---

## Login & Verification Test

### Test Farmer Account
```
Step 1: Go to /login
Step 2: Select Role: 👨‍🌾 Farmer
Step 3: Email: farmer.raj@gmail.com
Step 4: Password: FarmerRaj@123
Step 5: Click Login
Step 6: Should navigate to /farmer-dashboard

Verification:
☑️ Dashboard shows "Raj" or "Farmer Raj"
☑️ Go to /farmer/account
☑️ Should see:
   - Name: Farmer Raj ✅ (NOT "Vennela"!)
   - Email: farmer.raj@gmail.com ✅
   - Avatar shows "F" for Farmer
☑️ Crops, Orders buttons work
```

### Test Customer Account
```
Step 1: Go to /login
Step 2: Select Role: 🛒 Customer
Step 3: Email: customer.priya@gmail.com
Step 4: Password: CustomerPriya@123
Step 5: Click Login
Step 6: Should navigate to /home

Verification:
☑️ Home shows "Priya" or "Customer Priya"
☑️ Go to /account
☑️ Should see:
   - Name: Customer Priya ✅ (NOT "Vennela"!)
   - Email: customer.priya@gmail.com ✅
   - Avatar shows "C" for Customer
☑️ Cart, Orders buttons work
```

### Test Role Switching
```
Step 1: Logged in as Farmer → See "Farmer Raj"
Step 2: Click Logout
Step 3: Log in as Customer
Step 4: Go to /account → Should see "Customer Priya"
Step 5: Verify name actually changed (not cached)
☑️ Each role shows their own name
☑️ No "Vennela" showing up in customer account
☑️ Proper data isolation confirmed! ✅
```

---

## Common Issues & Fixes

### "Email already registered"
**Problem**: Trying to register with an email that's already used
**Solution**: Use a different email (farmer@, customer@, dealer@)

### Still seeing "Vennela" everywhere
**Problem**: Browser cached old user data
**Solution**:
1. Open DevTools (F12)
2. Application → localStorage
3. Click "Clear All"
4. Close browser completely
5. Reopen and try again

### Can't select role in register form
**Problem**: Role dropdown not showing options
**Solution**: Check browser console for errors
1. Open DevTools (F12)
2. Console tab
3. Look for red error messages
4. Screenshot and share if needed

### Password rejecting valid passwords
**Problem**: Password validation too strict
**Note**: Password MUST have:
- At least 8 characters
- 1 UPPERCASE letter (A-Z)
- 1 lowercase letter (a-z)
- 1 number (0-9)
- 1 special character (@#$%^&+=!)

Example: `FarmerRaj@123` ✓ Valid

---

## Success Indicators ✅

When the fix is working correctly, you should see:

| Scenario | Expected Result |
|----------|-----------------|
| Log in as Farmer | Account shows farmer's name |
| Log in as Customer | Account shows customer's name |
| Switch between roles | Name changes for each user |
| Clear cache & log in again | Same name appears (not cached) |
| Check user database | Different users with different emails |

---

## Database Verification (Optional)

If you want to check MongoDB directly:

```javascript
// In MongoDB Atlas or local mongo shell
db.users.find()

// Should show something like:
{
  _id: "...",
  name: "Farmer Raj",
  email: "farmer.raj@gmail.com",
  role: "farmer",
  ...
},
{
  _id: "...",
  name: "Customer Priya",
  email: "customer.priya@gmail.com",
  role: "customer",
  ...
}
```

Each document has different _id, name, email, role ✅

---

## Summary

**The Key Rule**: Use a **different email** for each user account. That's it! Once you do that:

1. ✅ Registration succeeds for each user
2. ✅ Login returns the correct user's JWT
3. ✅ Account pages show that user's name
4. ✅ Data is isolated per user
5. ✅ Switching roles shows different names

You've got this! 🚀
