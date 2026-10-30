import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  // Globally unique within the customer portal: login does not require a tenant selector.
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  password: { type: String, required: true, select: false },
  allowedOperatingCompanyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubCompany' }],
  isActive: { type: Boolean, default: true },
  sessionVersion: { type: Number, default: 0, select: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  lastLoginAt: Date,
}, { timestamps: true });

schema.index({ email: 1 }, { unique: true });
export default mongoose.models.CustomerUser || mongoose.model('CustomerUser', schema);
