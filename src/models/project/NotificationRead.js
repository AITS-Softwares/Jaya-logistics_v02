import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
  account: { type: mongoose.Schema.Types.ObjectId, required: true },
  eventKey: { type: String, required: true },
  readAt: { type: Date, required: true },
});
schema.index({ company: 1, account: 1, eventKey: 1 }, { unique: true });
export default mongoose.models.ERPNotificationRead || mongoose.model('ERPNotificationRead', schema);
