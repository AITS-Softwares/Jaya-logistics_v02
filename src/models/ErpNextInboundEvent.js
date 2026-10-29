import mongoose from "mongoose";

const schema = new mongoose.Schema({
  providerEventId: { type: String, required: true, trim: true, maxlength: 200 },
  eventHash: { type: String, required: true, trim: true, maxlength: 128 },
  erpNextDoctype: { type: String, required: true, trim: true, maxlength: 120 },
  erpNextName: { type: String, required: true, trim: true, maxlength: 160 },
  erpNextCompany: { type: String, trim: true, default: "", maxlength: 160 },
  docstatus: { type: Number, min: 0, max: 2, default: null },
  signatureValid: { type: Boolean, required: true, default: false },
  state: { type: String, enum: ["received", "processed", "ignored", "failed"], default: "received", index: true },
  mappingId: { type: mongoose.Schema.Types.ObjectId, ref: "ErpNextIntegrationMapping", default: null },
  error: { type: String, trim: true, default: "", maxlength: 500 },
}, { timestamps: true, collection: "erpnext_inbound_events" });

schema.index({ providerEventId: 1 }, { unique: true });
schema.index({ erpNextDoctype: 1, erpNextName: 1, createdAt: -1 });

export default mongoose.models.ErpNextInboundEvent || mongoose.model("ErpNextInboundEvent", schema);
