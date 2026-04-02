import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    cropId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop' },
    cropName: String,
    quantity: Number,
    pricePerKg: Number,
    farmerName: String,
    farmerLocation: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true, sparse: true }, // Unique order ID
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customerName: String,
    customerEmail: String,
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    farmerName: String,
    farmerEmail: String,
    farmerPhone: String,
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dealerName: String,
    dealerEmail: String,
    dealerPhone: String,
    dealerRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'DealerRequest' },

    customerSnapshot: {
      phone: String,
      doorNo: String,
      country: String,
      state: String,
      district: String,
      mandal: String,
      pincode: String,
      locationText: String,
      coordinates: { lat: Number, lng: Number },
      fullAddress: String, // New field for full address entered by user
    },

    // Items/Cargo
    items: [itemSchema],

    // Location Details
    delivery: {
      pickup: String,
      pickupDistrict: String,
      pickupMandal: String,
      pickupCoordinates: { lat: Number, lng: Number },
      drop: String,
      dropDistrict: String,
      dropMandal: String,
      dropCountry: String,
      dropState: String,
      dropPincode: String,
      dropDoorNo: String,
      dropLocationText: String,
      dropPhone: String,
      dropCoordinates: { lat: Number, lng: Number },
      distance: Number, // in km
    },

    // Transport Details
    transport: {
      dealerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      dealerName: String,
      vehicle: { type: String, enum: ['Bike', 'Auto', 'Truck'] },
      vehicleId: String,
      vehicleName: String,
      licensePlate: String,
      price: Number,
      ratePerKm: Number,
    },

    // Agreed/Final Price (from negotiation in chat)
    agreedPrice: { type: Number, default: null },

    // Pricing
    summary: {
      itemsTotal: Number,
      distanceKm: Number,
      transportBaseFee: Number,
      transportFee: Number,
      transportFinalFee: Number,
      batchDiscount: Number,
      dealerPayout: Number,
      platformContribution: Number,
      platformFee: Number,
      total: Number,
      incentives: {
        eligible: { type: Boolean, default: false },
        dealerBonus: { type: Number, default: 0 },
        farmerBonus: { type: Number, default: 0 },
        totalBonus: { type: Number, default: 0 },
      },
    },

    // Status
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Accepted', 'In Transit', 'Delivered', 'Rejected', 'Cancelled'],
      default: 'Pending'
    },
    
    // Request Specific
    requestStatus: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    requestExpiresAt: Date, // 5-minute timer for dealer response
    acceptedAt: Date,
    completedAt: Date,
    rejectedAt: Date,

    // Batch delivery grouping
    batchId: { type: String, default: null }, // null = single order, set = part of a batch trip
    batchDiscount: { type: Number, default: 0 }, // discount applied because of batching (₹)

    // Special Notes
    specialNotes: String,
    paymentMethod: { type: String, default: 'UPI' },

    // Notification tracking
    notifications: {
      orderConfirmation: {
        customer: { type: Boolean, default: false },
        farmer: { type: Boolean, default: false },
        dealer: { type: Boolean, default: false },
        sentAt: Date,
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
