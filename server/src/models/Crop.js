import mongoose from 'mongoose';

const cropSchema = new mongoose.Schema(
  {
    // Basic Information
    cropName: { type: String, required: true, trim: true },
    variety: { type: String, trim: true }, // Crop variety (e.g., Hybrid, Local)
    category: { 
      type: String, 
      enum: ['Vegetable', 'Fruit', 'Pulse', 'Grain', 'Spice', 'Herb', 'Other'],
      required: true
    },
    
    // Pricing & Quantity
    pricePerKg: { type: Number, required: true, min: 0 },
    totalQuantity: { type: Number, min: 0 }, // in kg (initial listed quantity)
    availableQuantity: { type: Number, required: true, min: 0 }, // in kg
    minimumOrderQuantity: { type: Number, default: 1, min: 0.1 },
    mandiReference: {
      commodity: String,
      mandiUnit: String,
      modalPricePerQuintal: Number,
      minPricePerQuintal: Number,
      maxPricePerQuintal: Number,
      suggestedPricePerKg: Number,
      market: String,
      state: String,
      arrivalDate: String,
      recordCount: Number,
      lastSyncedAt: Date,
    },
    
    // Images
    images: [String], // URLs
    
    // Description & Details
    description: String,
    guidance: String,
    guidanceLanguage: { type: String, enum: ['en', 'te', 'hi'], default: 'en' },
    productionDate: Date,
    expiryDate: Date,
    
    // Quality & Certification
    quality: { 
      type: String, 
      enum: ['Premium', 'Standard', 'Economy'],
      default: 'Standard'
    },
    isOrganic: { type: Boolean, default: false },
    
    // Farming Details
    irrigationMethod: { type: String, trim: true }, // e.g., Drip, Sprinkler, Flood
    fertilizerUsed: { type: String, trim: true }, // e.g., Urea, DAP, Organic
    storageType: { type: String, trim: true }, // e.g., Ambient, Cold Storage, Refrigerated
    moisturePercentage: { type: Number, min: 0, max: 100 }, // Moisture content %
    
    // Farmer Information
    farmerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    farmerName: String,
    farmerEmail: String,
    farmerPhone: String,
    farmerLocation: String,
    farmerState: String,
    farmerDistrict: String,
    farmerMandal: String,
    farmerDoorNo: String,
    farmerPincode: String,
    
    // Status
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ['listed', 'sold', 'hidden'], default: 'listed' },
  },
  { timestamps: true }
);

// Index for faster queries
cropSchema.index({ farmerId: 1 });
cropSchema.index({ category: 1 });
cropSchema.index({ isActive: 1 });
cropSchema.index({ cropName: 'text', description: 'text' });

export default mongoose.model('Crop', cropSchema);
