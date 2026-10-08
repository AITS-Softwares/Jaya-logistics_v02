import mongoose from "mongoose";

const mobileOperationalAlertSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: "DriverTrip", required: true, index: true },
  kind: { type: String, enum: ["tracking_missing", "tracking_stale", "driver_issue"], required: true },
  severity: { type: String, enum: ["medium", "high"], default: "medium" },
  state: { type: String, enum: ["open", "acknowledged", "resolved"], default: "open", index: true },
  message: { type: String, required: true, maxlength: 500 },
  firstDetectedAt: { type: Date, default: Date.now },
  lastDetectedAt: { type: Date, default: Date.now },
  acknowledgedAt: { type: Date, default: null },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", default: null },
  resolvedAt: { type: Date, default: null },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", default: null },
  resolutionNote: { type: String, default: "", maxlength: 500 },
}, { timestamps: true });

mobileOperationalAlertSchema.index({ companyId: 1, tripId: 1, kind: 1, state: 1 });
mobileOperationalAlertSchema.index({ companyId: 1, state: 1, severity: -1, lastDetectedAt: -1 });

export default mongoose.models.MobileOperationalAlert || mongoose.model("MobileOperationalAlert", mobileOperationalAlertSchema);
