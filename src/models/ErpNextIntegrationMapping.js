import mongoose from "mongoose";

// Stable local-to-ERPNext identity map. This deliberately stores identifiers
// and hashes only; request payloads and credentials never belong here.
const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  subCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: "SubCompany", required: true, index: true },
  localDoctype: { type: String, required: true, trim: true, maxlength: 120 },
  localRecordId: { type: String, required: true, trim: true, maxlength: 128 },
  erpNextCompany: { type: String, required: true, trim: true, maxlength: 160 },
  erpNextDoctype: { type: String, required: true, trim: true, maxlength: 120 },
  erpNextName: { type: String, trim: true, default: "", maxlength: 160 },
  externalId: { type: String, trim: true, default: "", maxlength: 200 },
  sourceHash: { type: String, trim: true, default: "", maxlength: 128 },
  syncVersion: { type: Number, default: 1, min: 1 },
  status: {
    type: String,
    enum: ["not_ready", "queued", "processing", "synced", "retry_pending", "blocked", "failed", "correction_requested"],
    default: "not_ready",
    index: true,
  },
  lastSyncedAt: { type: Date, default: null },
  lastError: { type: String, trim: true, default: "", maxlength: 500 },
}, { timestamps: true, collection: "erpnext_integration_mappings" });

schema.index({ companyId: 1, subCompanyId: 1, localDoctype: 1, localRecordId: 1, erpNextDoctype: 1 }, { unique: true });
schema.index({ companyId: 1, erpNextDoctype: 1, erpNextName: 1 });

export default mongoose.models.ErpNextIntegrationMapping || mongoose.model("ErpNextIntegrationMapping", schema);
