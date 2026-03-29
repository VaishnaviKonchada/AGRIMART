import mongoose from "mongoose";

const mandalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    district: {
      type: String,
      required: true,
      index: true,
    },
    region: String,
    pincode: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  { timestamps: true }
);

// Compound index for faster queries
mandalSchema.index({ district: 1, name: 1 });

export default mongoose.model("Mandal", mandalSchema);
