import mongoose from "mongoose";

// A durable queue record. The snapshot is a redacted, accounting-document
// payload only - never an HTTP request, response, credential, or attachment.
const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  subCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: "SubCompany", required: true, index: true },
  localDoctype: { type: String, required: true, trim: true, maxlength: 120 },
  localRecordId: { type: String, required: true, trim: true, maxlength: 128 },
  erpNextCompany: { type: String, required: true, trim: true, maxlength: 160 },
  erpNextDoctype: { type: String, required: true, trim: true, maxlength: 120 },
  eventType: { type: String, required: true, trim: true, maxlength: 100 },
  idempotencyKey: { type: String, required: true, trim: true, maxlength: 200 },
  sourceHash: { type: String, required: true, trim: true, maxlength: 128 },
  payloadSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  state: {
    type: String,
    enum: ["queued", "processing", "synced", "retry_pending", "blocked", "failed"],
    default: "queued",
    index: true,
  },
  attempts: { type: Number, default: 0, min: 0 },
  nextAttemptAt: { type: Date, default: null, index: true },
  lastError: { type: String, trim: true, default: "", maxlength: 500 },
  workerLock: { type: String, trim: true, default: "", maxlength: 100 },
  lockedAt: { type: Date, default: null },
  erpNextName: { type: String, trim: true, default: "", maxlength: 160 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", default: null },
}, { timestamps: true, collection: "erpnext_integration_outbox" });

schema.index({ companyId: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ companyId: 1, subCompanyId: 1, state: 1, nextAttemptAt: 1, createdAt: 1 });

export default mongoose.models.ErpNextIntegrationOutbox || mongoose.model("ErpNextIntegrationOutbox", schema);
