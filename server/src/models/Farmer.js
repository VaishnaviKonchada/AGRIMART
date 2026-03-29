import mongoose from 'mongoose';

const farmerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    status: { type: String, enum: ['active', 'blocked', 'suspended', 'pending'], default: 'active' },
    profile: {
      country: String,
      state: String,
      district: String,
      mandal: String,
      doorNo: String,
      pincode: String,
      locationText: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
      phone: String,
      avatarUrl: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Farmer', farmerSchema);
