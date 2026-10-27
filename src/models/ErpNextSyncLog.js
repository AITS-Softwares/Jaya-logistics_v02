import mongoose from "mongoose";

// This model intentionally records only operational metadata. Request bodies,
// response bodies, tokens, API keys, and full error stacks must never be saved
// here because the log is available to application administrators.
function sanitizeAuditText(value, maxLength = 500) {
  if (value === undefined || value === null) return "";

  return String(value)
    .replace(/(["']?(?:authorization|api[_-]?(?:key|secret)|token|password)["']?\s*[:=]\s*["']?)(?:(?:token|bearer)\s+)?[^\s,;"'}]+/gi, "$1[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

const attemptSchema = new mongoose.Schema({
  attemptedAt: { type: Date, required: true, default: Date.now },
  status: {
    type: String,
    enum: ["processing", "synced", "failed", "requires_review"],
    required: true,
  },
  httpStatus: { type: Number, default: null, min: 100, max: 599 },
  summary: { type: String, default: "", maxlength: 500, set: sanitizeAuditText },
}, { _id: false });

const erpNextSyncLogSchema = new mongoose.Schema({
  // The tenant boundary is mandatory on every query and index.
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },

  // The active operating company is the legal issuer of invoices and statutory
  // documents. It is optional only to support legacy records created before
  // operating-company scope existed; new accounting exports must populate it.
  subCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: "SubCompany", default: null, index: true },
  subCompanyCode: { type: String, trim: true, default: "", maxlength: 40 },
  subCompanyName: { type: String, trim: true, default: "", maxlength: 160 },

  // Source identifiers are strings so this audit model can support current
  // Mongo records as well as future non-Mongo/imported source identifiers.
  localDoctype: { type: String, required: true, trim: true, maxlength: 120 },
  localRecordId: { type: String, required: true, trim: true, maxlength: 128 },

  erpNextDoctype: { type: String, trim: true, default: "", maxlength: 120 },
  erpNextName: { type: String, trim: true, default: "", maxlength: 160 },

  // Typical actions include create, update, submit, refresh, generate_einvoice
  // and generate_ewaybill. It remains extensible so new financial doctypes do
  // not require a database migration just to add a safe action name.
  action: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
  status: {
    type: String,
    enum: ["pending", "processing", "synced", "failed", "requires_review"],
    required: true,
    default: "pending",
    index: true,
  },

  // The caller derives this from the local record and intended ERP operation.
  // It is a retry key, not a secret, and is unique per company.
  idempotencyKey: { type: String, required: true, trim: true, maxlength: 200 },

  attemptCount: { type: Number, required: true, default: 0, min: 0 },
  attempts: { type: [attemptSchema], default: [] },
  lastAttemptAt: { type: Date, default: null },
  nextAttemptAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  reconciledAt: { type: Date, default: null },

  // Short, sanitised summaries only; never use these fields for raw payloads.
  responseSummary: { type: String, default: "", maxlength: 500, set: sanitizeAuditText },
  lastError: { type: String, default: "", maxlength: 500, set: sanitizeAuditText },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", default: null },
}, { timestamps: true, collection: "erp_next_sync_logs" });

// One durable log per retry-safe operation. Attempts append to this record;
// callers can therefore retry without creating a second accounting document.
erpNextSyncLogSchema.index({ companyId: 1, idempotencyKey: 1 }, { unique: true });
erpNextSyncLogSchema.index({ companyId: 1, localDoctype: 1, localRecordId: 1, action: 1, createdAt: -1 });
erpNextSyncLogSchema.index({ companyId: 1, subCompanyId: 1, localDoctype: 1, localRecordId: 1, createdAt: -1 });
erpNextSyncLogSchema.index({ companyId: 1, status: 1, nextAttemptAt: 1, updatedAt: -1 });
erpNextSyncLogSchema.index({ companyId: 1, erpNextDoctype: 1, erpNextName: 1 });

export { sanitizeAuditText };
export default mongoose.models.ErpNextSyncLog || mongoose.model("ErpNextSyncLog", erpNextSyncLogSchema);
