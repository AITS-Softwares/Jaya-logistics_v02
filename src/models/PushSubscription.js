import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  accountType: { type: String, enum: ['user', 'company'], required: true },
  endpoint: { type: String, required: true },
  endpointHash: { type: String, required: true, unique: true },
  keys: { p256dh: { type: String, required: true }, auth: { type: String, required: true } },
  userAgent: { type: String, default: '' },
}, { timestamps: true });
schema.index({ userId: 1, companyId: 1 });
export default mongoose.models.PushSubscription || mongoose.model('PushSubscription', schema);
