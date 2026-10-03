import mongoose from 'mongoose';

const detentionRuleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  active: { type: Boolean, default: true },
  movementType: { type: String, enum: ['LOCAL', 'OUTSTATION'], required: true },
  ruleType: { type: String, enum: ['LOCAL_CALENDAR', 'OUTSTATION_NEXT_DAY_CUTOFF', 'OUTSTATION_NEXT_CALENDAR_DAY'], required: true },
  cutoffTime: { type: String, default: '16:00' },
  graceDays: { type: Number, default: 1, min: 0 },
  additionalDayMethod: { type: String, enum: ['PARTIAL_24_HOURS', 'CALENDAR_DAY'], default: 'PARTIAL_24_HOURS' },
  ratePerDay: { type: Number, default: 0, min: 0 },
  effectiveFrom: { type: Date, default: Date.now },
  priority: { type: Number, default: 100 },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  // Rules are configured separately for each operating company.
  subCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCompany', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }
}, { timestamps: true });

detentionRuleSchema.index({ companyId: 1, subCompanyId: 1, active: 1, movementType: 1, priority: 1 });
export default mongoose.models.DetentionRule || mongoose.model('DetentionRule', detentionRuleSchema);
