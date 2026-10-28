import mongoose from 'mongoose';

const reapprovalAuditSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  panel: { type: String, required: true, index: true },
  recordId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  recordNo: { type: String, default: '' },
  action: { type: String, required: true, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, default: null },
  actorName: { type: String, default: '' },
  reason: { type: String, default: '' },
  revision: { type: Number, default: 0 },
  batchId: { type: String, default: '', index: true },
  before: { type: mongoose.Schema.Types.Mixed, default: null },
  after: { type: mongoose.Schema.Types.Mixed, default: null },
  details: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

const ReapprovalAudit = mongoose.models.ReapprovalAudit || mongoose.model('ReapprovalAudit', reapprovalAuditSchema);
export default ReapprovalAudit;
