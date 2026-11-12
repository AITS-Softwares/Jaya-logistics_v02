import mongoose from 'mongoose';

const detentionRuleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  active: { type: Boolean, default: true },
  detentionType: { type: String, enum: ['LOADING', 'UNLOADING'], default: 'LOADING' },
  movementType: { type: String, enum: ['LOCAL', 'OUTSTATION', 'ALL'], required: true },
  ruleType: { type: String, enum: ['LOCAL_CALENDAR', 'OUTSTATION_NEXT_DAY_CUTOFF', 'OUTSTATION_NEXT_CALENDAR_DAY', 'UNLOADING_CUTOFF', 'UNLOADING_BEFORE_CUTOFF', 'UNLOADING_AT_OR_AFTER_CUTOFF'], required: true },
  cutoffTime: { type: String, default: '16:00' },
  graceDays: { type: Number, default: 1, min: 0 },
  additionalDayMethod: { type: String, enum: ['PARTIAL_24_HOURS', 'CALENDAR_DAY'], default: 'PARTIAL_24_HOURS' },
  ratePerDay: { type: Number, default: 0, min: 0 },
  effectiveFrom: { type: Date, default: Date.now },
  priority: { type: Number, default: 100 },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  // Retain legacy ownership metadata; rule scope is now tenant-wide.
  subCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCompany', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }
}, { timestamps: true });

detentionRuleSchema.index({ companyId: 1, active: 1, movementType: 1, priority: 1 });

// Next.js can reload this module while Mongoose retains the previous model.
// Recompile only when the cached schema predates shared/unloading rules.
const cached = mongoose.models.DetentionRule;
if (cached && (
  cached.schema.path('subCompanyId')?.isRequired ||
  !cached.schema.path('detentionType') ||
  !cached.schema.path('movementType')?.enumValues?.includes('ALL') ||
  !cached.schema.path('ruleType')?.enumValues?.includes('UNLOADING_BEFORE_CUTOFF') ||
  !cached.schema.path('ruleType')?.enumValues?.includes('UNLOADING_AT_OR_AFTER_CUTOFF')
)) {
  mongoose.deleteModel('DetentionRule');
}
export default mongoose.models.DetentionRule || mongoose.model('DetentionRule', detentionRuleSchema);
