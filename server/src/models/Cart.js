import mongoose from 'mongoose';

const CartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userRole: {
    type: String,
    required: true,
    enum: ['customer', 'farmer', 'dealer', 'admin', 'guest']
  },
  items: [{
    cropId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Crop',
      required: true
    },
    cropName: String,
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    farmerName: String,
    farmerLocation: String,
    farmerCoordinates: {
      lat: Number,
      lng: Number
    },
    variety: String,
    pricePerKg: Number,
    quantity: {
      type: Number,
      default: 1
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

// Ensure unique cart per user & role
CartSchema.index({ userId: 1, userRole: 1 }, { unique: true });

const Cart = mongoose.model('Cart', CartSchema);
export default Cart;
