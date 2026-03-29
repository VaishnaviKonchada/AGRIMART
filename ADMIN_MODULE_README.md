# Admin Dashboard Module

## Overview
Complete admin dashboard for AgriBuy platform with comprehensive user and transaction management.

## Pages Created

### 1. AdminDashboard.js
- **Route**: `/admin`
- **Features**:
  - 8 stats cards (Farmers, Customers, Dealers, Orders, Revenue, Active Users, Complaints, Settlements)
  - System Overview section with platform health metrics
  - Recent Activity log showing latest actions
  - Professional gradient design
  - Real-time data from localStorage

### 2. FarmersManagement.js
- **Route**: `/admin/farmers`
- **Features**:
  - View all registered farmers
  - Enable/Disable farmer accounts
  - View detailed farmer profiles (crops, orders, sales)
  - Modal for detailed information
  - Sample data: 3 farmers

### 3. CustomersManagement.js
- **Route**: `/admin/customers`
- **Features**:
  - View all registered customers
  - Block/Unblock customer accounts
  - View order history and spending
  - Modal for customer details
  - Sample data: 3 customers

### 4. TransportDealersManagement.js
- **Route**: `/admin/dealers`
- **Features**:
  - Approve pending dealer registrations
  - Enable/Suspend active dealers
  - View fleet and performance metrics
  - Rating and trip statistics
  - Sample data: 3 dealers (Approved, Pending, Suspended)

### 5. OrdersMonitoring.js
- **Route**: `/admin/orders`
- **Features**:
  - View all platform orders in table format
  - Filter by status (All, Pending, Confirmed, In Transit, Delivered, Cancelled)
  - Detailed order modal with route and cargo information
  - Real-time data from "deliveries" localStorage
  - Color-coded status pills

### 6. PaymentsSettlements.js
- **Route**: `/admin/payments`
- **Features**:
  - Payment summary stats (Total Payouts, Platform Commission, Pending, Completed)
  - Detailed payment table with breakdown
  - 5% platform fee calculation
  - Payment status tracking
  - Dealer earnings display

### 7. ComplaintsSupport.js
- **Route**: `/admin/complaints`
- **Features**:
  - View all customer complaints
  - Filter by status (All, Open, Resolved)
  - Severity levels (High, Medium, Low) with color coding
  - Mark complaints as resolved
  - Add resolution notes
  - Sample data: 2 complaints

### 8. Reports.js
- **Route**: `/admin/reports`
- **Features**:
  - Download Orders CSV
  - Download Revenue Report (TXT)
  - Download Usage Report (TXT)
  - Visual metrics cards
  - Recent orders table

### 9. AdminAccount.js
- **Route**: `/admin/account`
- **Features**:
  - View admin profile
  - Edit profile information
  - View permissions list
  - Logout functionality
  - Platform overview stats

## Navigation

### AdminBottomNav.js
- Fixed bottom navigation bar
- 9 navigation items:
  1. Dashboard (📊)
  2. Farmers (👨‍🌾)
  3. Customers (👥)
  4. Dealers (🚚)
  5. Orders (📦)
  6. Payments (💳)
  7. Complaints (⚠️)
  8. Reports (📈)
  9. Account (👤)

## Styling

### CSS Files Created:
1. **AdminDashboard.css**
   - Stats grid with gradient backgrounds
   - Health bar visualization
   - Activity log styling

2. **FarmersManagement.css**
   - Card-based layout
   - Modal styling
   - Enable/Disable toggle buttons

3. **ManagementPages.css** (Shared)
   - Comprehensive styles for all management pages
   - Table styling for Orders/Payments
   - Modal components
   - Filter buttons
   - Action buttons
   - Status badges
   - Report sections
   - Admin Account specific styles

4. **AdminBottomNav.css**
   - Fixed bottom navigation
   - Responsive grid layout
   - Active state indicators

## Role-Based Access Control

### Protected Routes:
All admin routes are wrapped with `<RequireRole role="admin">` to ensure only authenticated admin users can access.

### Login:
- Login page includes "Admin" role option
- Redirects to `/admin` after successful admin login

### Registration:
- Register page includes "Admin" role option
- Stores admin credentials in localStorage

## Sample Data

### localStorage Keys:
- `farmers` - Array of farmer accounts
- `customers` - Array of customer accounts
- `dealers` - Array of transport dealer accounts
- `deliveries` - Array of all platform orders
- `complaints` - Array of customer complaints
- `registeredUser` - Currently logged-in user
- `adminProfile` - Admin profile data

## Color Scheme

### Primary Colors:
- Purple: `#667eea` - `#764ba2`
- Green: `#22c55e` - `#10b981`
- Blue: `#3b82f6`
- Orange: `#f97316`
- Red: `#ef4444`

### Status Colors:
- Active/Approved/Delivered: Green
- Pending: Orange
- Inactive/Blocked/Suspended: Red
- Warning: Yellow

## Features Summary

### View-Only Operations:
- Monitor all users (farmers, customers, dealers)
- Track all orders and transactions
- View payment settlements
- Download reports

### Control Operations:
- Enable/Disable user accounts
- Approve dealer registrations
- Block/Unblock users
- Mark complaints as resolved
- Add resolution notes

### Analytics:
- Platform health metrics
- Revenue calculations (5% commission)
- User activity tracking
- Order statistics

## Technology Stack
- React 18
- React Router 6
- localStorage for data persistence
- CSS Grid & Flexbox
- Gradient backgrounds
- Modal components

## Installation & Usage

1. All admin files are in `src/admin/` directory
2. Routes configured in `src/App.js`
3. Role protection via `RequireRole` component
4. No backend required - fully frontend with localStorage

## Testing

### Test Admin Account:
1. Register with role: "Admin"
2. Login with admin credentials
3. Access `/admin` dashboard
4. Navigate through all 9 pages

### Sample Data Auto-Seeds:
- Farmers: 3 accounts
- Customers: 3 accounts
- Dealers: 3 accounts
- Orders: Data from "deliveries"
- Complaints: 2 sample complaints

## Future Enhancements
- Backend API integration
- Real-time notifications
- Advanced filtering and search
- Export to Excel
- Email notifications
- User messaging system
- Analytics charts (Chart.js)
- Audit logs
