import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true }, subCompanyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrderPanel', required: true }, orderNo: String,
  items: [mongoose.Schema.Types.Mixed], status: { type: String, enum: ['Pending', 'In Progress', 'Completed'] },
  inspectedBy: String, inspectedAt: Date, history: [mongoose.Schema.Types.Mixed],
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ companyId: 1, subCompanyId: 1, orderId: 1 }, { unique: true });
export default mongoose.models.PdiPanel || mongoose.model('PdiPanel', schema);
