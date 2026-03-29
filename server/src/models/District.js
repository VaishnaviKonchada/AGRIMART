import mongoose from "mongoose";

const districtSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      required: true,
    },
    district: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    mandalCount: {
      type: Number,
      default: 0,
    },
    region: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  { timestamps: true }
);

export default mongoose.model("District", districtSchema);
