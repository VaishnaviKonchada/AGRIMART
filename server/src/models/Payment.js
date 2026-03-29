import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, required: true },
    platformFee: { type: Number, default: 0 }, // Calculated as 2% of order value, capped at 100
    dealerPayout: Number,
    status: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Completed' },
    method: { type: String, default: 'UPI' },
    transactionRef: String,
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
