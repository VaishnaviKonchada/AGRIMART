import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dealerRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'DealerRequest' },
    messages: [messageSchema],
    negotiation: {
      offeredPrice: Number,
      finalPrice: Number,
      vehicle: String,
      pickup: String,
      drop: String,
      customerDecision: {
        type: String,
        enum: ['pending', 'confirmed', 'rejected'],
        default: 'pending',
      },
      dealerDecision: {
        type: String,
        enum: ['pending', 'confirmed', 'rejected'],
        default: 'pending',
      },
    },
    confirmed: { type: Boolean, default: false },
    confirmedAt: Date,
  },
  { timestamps: true }
);

chatSchema.index({ dealerRequestId: 1 }, { sparse: true });

export default mongoose.model('Chat', chatSchema);
