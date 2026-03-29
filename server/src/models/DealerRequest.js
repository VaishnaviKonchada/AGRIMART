import mongoose from 'mongoose';

const dealerRequestSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dealerName: { type: String, required: true },
    
    // Route Details
    pickupLocation: { type: String, required: true },
    dropLocation: { type: String, required: true },
    distance: { type: Number, required: true }, // in km
    
    // Order Details
    quantity: { type: Number, required: true }, // in kg
    vehicleType: { type: String, enum: ['BIKE', 'AUTO', 'TRUCK'], required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId },
    vehicleName: { type: String },
    licensePlate: { type: String },
    
    // Pricing
    quotedPrice: { type: Number, required: true },
    pricing: {
      distanceKm: { type: Number, default: 0 },
      baseCharge: { type: Number, default: 0 },
      finalCharge: { type: Number, default: 0 },
      batchDiscount: { type: Number, default: 0 },
      batchDiscountRate: { type: Number, default: 0 },
      batchDiscountRatePct: { type: Number, default: 0 },
      dealerPayout: { type: Number, default: 0 },
      platformContribution: { type: Number, default: 0 },
      incentivePreview: {
        eligible: { type: Boolean, default: false },
        dealerBonus: { type: Number, default: 0 },
        farmerBonus: { type: Number, default: 0 },
        totalBonus: { type: Number, default: 0 },
      },
    },
    
    // Status
    status: { 
      type: String, 
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'COMPLETED'], 
      default: 'PENDING' 
    },
    
    // Timestamps
    requestSentAt: { type: Date, default: Date.now },
    expiresAt: { type: Date }, // 5 minutes from request
    respondedAt: { type: Date },
    
    // Additional Info
    farmerName: String,
    farmerLocation: String,
    cropItem: String,
    cropDetails: String,
    customerPhone: { type: String, required: true },
    customerDoorNo: String,
    customerCountry: { type: String, required: true },
    customerState: { type: String, required: true },
    customerDistrict: { type: String, required: true },
    customerMandal: { type: String, required: true },
    customerPincode: { type: String, required: true },
    customerLocationText: { type: String, required: true },
    customerCoordinates: {
      lat: Number,
      lng: Number,
    },
    fullAddress: { type: String }, // Save full address entered by customer
    rejectReason: String,
    
    // Notification tracking
    notificationSent: { type: Boolean, default: false },
    dealerViewed: { type: Boolean, default: false },
    chatStarted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for faster queries
dealerRequestSchema.index({ customerId: 1 });
dealerRequestSchema.index({ dealerId: 1 });
dealerRequestSchema.index({ status: 1 });
dealerRequestSchema.index({ expiresAt: 1 });

export default mongoose.model('DealerRequest', dealerRequestSchema);
