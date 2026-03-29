import mongoose from 'mongoose';

const transportDealerSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    dealerName: { type: String, required: true },
    dealerEmail: { type: String, required: true },
    dealerPhone: { type: String },
    dealerPhoto: { type: String },
    
    // Vehicle Types & Details (service areas per vehicle)
    vehicles: [
      {
        vehicleName: { type: String },
        vehicleType: { type: String, enum: ['BIKE', 'AUTO', 'TRUCK'], required: true },
        licensePlate: { type: String, required: true },
        capacity: { type: Number, required: true }, // in kg
        year: { type: Number },
        insuranceExpiry: { type: String },
        quantity: { type: Number, default: 1 },
        status: { type: String, default: 'Active' },
        documentVerified: { type: Boolean, default: false },
        basePrice: { type: Number, default: 0 }, // per km
        pricePerKg: { type: Number, default: 0 },
        perKmPrice: { type: Number, default: 10 },
        isActive: { type: Boolean, default: true },
        isVisibleToCustomers: { type: Boolean, default: false },
        pickupLocations: [String],
        dropLocations: [String],
      }
    ],
    
    // Service Locations (legacy - keep for backward compatibility)
    pickupLocations: [String],
    dropLocations: [String],
    
    // Rating & Reviews
    rating: { type: Number, default: 5, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    
    // Bank Details
    bankAccountNumber: String,
    bankIFSC: String,
    bankAccountHolder: String,
    
    // Status
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    totalTrips: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    
    // Contact
    alternatePhone: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
  },
  { timestamps: true }
);

// Index for faster queries
transportDealerSchema.index({ dealerId: 1 });
transportDealerSchema.index({ 'vehicles.vehicleType': 1, 'vehicles.isVisibleToCustomers': 1 });
// Note: Cannot create compound index on two array fields (pickupLocations and dropLocations)
// Using separate indexes instead
transportDealerSchema.index({ 'vehicles.pickupLocations': 1 });
transportDealerSchema.index({ 'vehicles.dropLocations': 1 });

export default mongoose.model('TransportDealer', transportDealerSchema);
