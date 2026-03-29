# 🧪 REAL-TIME BACKEND INTEGRATION - TESTING GUIDE

## Quick Start Testing

### Step 1: Verify Servers Are Running

```bash
# Check Backend (should be on 8081)
curl http://localhost:8081/api/health
# Expected: {"ok": true, "ts": 1234567890}

# Check Frontend (should be on 3000)
Open http://localhost:3000 in browser
```

---

## Step 2: Manual Testing Flow

### Test 1: TransportDealerRequests Page
**What to test:** Pending orders with real data

```
1. Login as Transport Dealer
2. Go to Dashboard → Click "📬 Transport Requests"
3. Verify:
   ✅ Shows customer names (NOT "Ramesh Kumar" demo)
   ✅ Shows farmer names (NOT duplicate customer)
   ✅ Shows 5-minute countdown timer
   ✅ Distance shows real calculated value
   ✅ Location shows district/mandal names
4. Click "✅ Accept" button
5. Verify:
   ✅ Request disappears from page
   ✅ Appears in "Confirmed Orders" page
```

### Test 2: TransportDealerOrders Page
**What to test:** Confirmed orders with real data

```
1. From Requests page, accept an order
2. Click "Confirmed Orders" in bottom nav
3. Verify:
   ✅ Accepted order appears in list
   ✅ Shows real customer name
   ✅ Shows real farmer name
   ✅ Shows real distance
   ✅ Shows real pickup/drop locations
   ✅ Shows real amount
   ✅ Page auto-refreshes every 15 seconds
```

### Test 3: TransportDealerEarnings Page
**What to test:** Real earnings calculation

```
1. Go to Earnings page
2. Verify:
   ✅ "Total Received" shows aggregated amount
   ✅ "This Month" shows filtered amount
   ✅ "This Week" shows filtered amount
   ✅ "Most Recent Delivery" shows latest order
   ✅ Page auto-refreshes every 30 seconds
3. Mark an order as delivered (in DB)
4. Watch earnings update automatically
```

### Test 4: TransportDealerPayments Page
**What to test:** Real payment history

```
1. Go to Payments page
2. Verify:
   ✅ Shows completed order transactions
   ✅ Shows real amounts (from DB)
   ✅ Shows customer names
   ✅ Shows transaction dates
   ✅ Total earnings card shows sum
   ✅ Order count is accurate
   ✅ Page auto-refreshes every 30 seconds
```

---

## Step 3: API Testing (Optional)

### Test GET /api/dealer/requests/:dealerId

```bash
curl "http://localhost:8081/api/dealer/requests/YOUR_DEALER_ID"

# Expected response:
{
  "success": true,
  "count": 2,
  "requests": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "orderId": "ORD-2024-001",
      "customerName": "Rajesh Kumar",
      "farmerName": "Suresh Patel",
      "cropItem": "Tomatoes",
      "quantity": 200,
      "pickupLocation": "Tandur, Vikarabad",
      "dropLocation": "Hyderabad Market",
      "distance": 45,
      "vehicleType": "Truck",
      "amount": 2500,
      "timeRemaining": 187
    }
  ]
}
```

### Test GET /api/dealer/orders/:dealerId

```bash
curl "http://localhost:8081/api/dealer/orders/YOUR_DEALER_ID"

# Expected response:
{
  "success": true,
  "count": 3,
  "orders": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "orderId": "ORD-2024-001",
      "customerName": "Rajesh Kumar",
      "farmerName": "Suresh Patel",
      "status": "Accepted",
      "distance": 45,
      "amount": 2500
    }
  ]
}
```

### Test GET /api/dealer/earnings/:dealerId

```bash
curl "http://localhost:8081/api/dealer/earnings/YOUR_DEALER_ID"

# Expected response:
{
  "success": true,
  "earnings": {
    "totalReceived": 12500,
    "thisMonth": 5200,
    "thisWeek": 2100,
    "completedDeliveries": 5,
    "recentOrder": {
      "orderId": "ORD-2024-005",
      "amount": 1200,
      "createdAt": "2024-01-14T15:45:00Z"
    }
  }
}
```

### Test POST /api/dealer/requests/:orderId/accept

```bash
curl -X POST "http://localhost:8081/api/dealer/requests/SOME_ORDER_ID/accept" \
  -H "Content-Type: application/json" \
  -d '{"dealerId": "YOUR_DEALER_ID"}'

# Expected response:
{
  "success": true,
  "message": "Request accepted successfully",
  "order": {
    "_id": "507f1f77bcf86cd799439011",
    "requestStatus": "accepted",
    "status": "Accepted",
    "acceptedAt": "2024-01-15T10:35:00Z"
  }
}
```

---

## Step 4: Verify No Dummy Data

### Check TransportDealerRequests.js

**❌ SHOULD NOT HAVE:**
```javascript
// ❌ NO MORE:
const demoRequests = [
  { id: 1, customerName: "Ramesh Kumar", ... },
  { id: 2, customerName: "Suresh Patel", ... }
];

// ❌ NO MORE:
localStorage.getItem("transportRequests")
```

**✅ SHOULD HAVE:**
```javascript
// ✅ NOW HAS:
const response = await fetch(`${API_URL}/dealer/requests/${user?.id}`);
const data = await response.json();
setRequests(data.requests);
```

### Check Other Pages
- ✅ No `localStorage.getItem("deliveries")`
- ✅ No hardcoded order arrays
- ✅ No demo amounts (1200, 450, 2800)
- ✅ All data from API endpoints

---

## Step 5: Monitor Auto-Refresh

### TransportDealerRequests
- **Expected:** Page refreshes every 10 seconds
- **How to verify:** Watch network tab in DevTools, see GET requests every 10s

### TransportDealerOrders
- **Expected:** Page refreshes every 15 seconds
- **How to verify:** Watch network tab, see GET requests every 15s

### TransportDealerEarnings
- **Expected:** Page refreshes every 30 seconds
- **How to verify:** Watch network tab, see GET requests every 30s

### TransportDealerPayments
- **Expected:** Page refreshes every 30 seconds
- **How to verify:** Watch network tab, see GET requests every 30s

---

## Step 6: Test 5-Minute Timer

```
1. Open TransportDealerRequests
2. Accept an order (will auto-reject after 5 minutes if dealer doesn't accept)
3. Watch countdown timer:
   - 5:00 → 4:59 → 4:58 ... → 0:00
4. When timer hits 0:00:
   - Button should be disabled
   - Order should be rejected (check database)
5. Refresh page, should NOT appear in pending
```

---

## Step 7: Test Accept/Reject Flow

### Accept Flow
```
1. See pending request with 5-min timer
2. Click "✅ Accept"
3. Verify:
   ✅ Endpoint called: POST /api/dealer/requests/:id/accept
   ✅ Order removed from requests page
   ✅ Appears in confirmed orders page
   ✅ Status changed from "pending" to "accepted" in DB
```

### Reject Flow
```
1. See pending request
2. Click "✕ Reject"
3. Verify:
   ✅ Endpoint called: POST /api/dealer/requests/:id/reject
   ✅ Order removed from requests page
   ✅ Does NOT appear in confirmed orders
   ✅ Status changed to "rejected" in DB
   ✅ No earnings counted
```

---

## Step 8: Browser DevTools Testing

### Open DevTools (F12)

**Network Tab:**
- ✅ See GET /api/dealer/requests every 10s
- ✅ See GET /api/dealer/orders every 15s
- ✅ See GET /api/dealer/earnings every 30s
- ✅ See GET /api/dealer/payments every 30s
- ✅ POST endpoints when accept/reject clicked

**Console Tab:**
- ✅ No errors logged
- ✅ API responses printed (if logging enabled)
- ✅ No "undefined" values

**Application Tab:**
- ✅ No localStorage["transportRequests"] (removed)
- ✅ No localStorage["deliveries"] (removed)
- ✅ registeredUser still stored (correct)

---

## Checklist: Zero Dummy Data Verification

- [ ] TransportDealerRequests: No hardcoded "Ramesh Kumar"
- [ ] TransportDealerRequests: No "Suresh Patel" demo
- [ ] TransportDealerRequests: No "Priya Sharma" demo
- [ ] TransportDealerOrders: No localStorage.deliveries
- [ ] TransportDealerOrders: Shows real customer/farmer names
- [ ] TransportDealerEarnings: Earnings calculated from DB
- [ ] TransportDealerEarnings: No hardcoded amounts
- [ ] TransportDealerPayments: No fake transaction breakdown
- [ ] All pages fetch from /api/dealer/* endpoints
- [ ] All pages have auto-refresh enabled
- [ ] 5-minute timer working on requests
- [ ] Accept/Reject buttons functional
- [ ] No compilation errors
- [ ] No console errors
- [ ] Loading states show while fetching
- [ ] Empty states show when no data

---

## Success Indicators

✅ **All pages working:** Requests → Orders → Earnings → Payments

✅ **Real data displayed:** Customer names, farmer names from DB

✅ **Zero dummy data:** No hardcoded orders, demo values, or localStorage arrays

✅ **Auto-refresh working:** Network tab shows periodic GET requests

✅ **5-minute timer active:** Countdown visible, auto-rejects on expiration

✅ **API endpoints functioning:** All 7 endpoints returning data

✅ **No errors:** Console clean, compilation successful

✅ **Production ready:** All systems operational and tested

---

## Troubleshooting

### If pages show "No pending requests"
- Check if orders exist in MongoDB
- Verify dealerId matches logged-in user
- Check backend is running on 8081
- Check browser console for API errors

### If auto-refresh not working
- Check network tab for periodic requests
- Verify setInterval is running (DevTools)
- Check API endpoint returns valid JSON
- Restart frontend if needed

### If customer/farmer names blank
- Check Order model has these fields
- Verify customer/farmer data populated in DB
- Check API response includes names
- Look at API response in DevTools Network tab

### If 5-minute timer not working
- Verify requestExpiresAt field in DB
- Check timeout calculation in backend
- Monitor network tab for reject call
- Verify order status changes to "rejected"

---

## When Everything Works

You'll see:
- ✅ Real customer and farmer names
- ✅ Real distances (Haversine calculated)
- ✅ Real locations (district/mandal)
- ✅ Real order amounts
- ✅ Real payment history
- ✅ Real earnings calculations
- ✅ Working 5-minute timer
- ✅ Auto-refreshing pages
- ✅ No dummy data anywhere
- ✅ Professional UI with real data

**Status:** Complete real-time backend integration! 🎉
