import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    severity: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    status: { type: String, enum: ['Open', 'Resolved'], default: 'Open' },
    message: { type: String, required: true },
    resolutionNotes: String,
  },
  { timestamps: true }
);

export default mongoose.model('Complaint', complaintSchema);
