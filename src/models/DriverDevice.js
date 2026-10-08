import mongoose from "mongoose";

const driverDeviceSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "DriverProfile", required: true, index: true },
  installationIdHash: { type: String, required: true, select: false },
  platform: { type: String, enum: ["android"], default: "android" },
  manufacturer: { type: String, default: "", maxlength: 80 },
  model: { type: String, default: "", maxlength: 120 },
  appVersion: { type: String, default: "", maxlength: 40 },
  status: { type: String, enum: ["pending", "approved", "revoked"], default: "pending", index: true },
  lastSeenAt: { type: Date, default: null },
  lastKnownBattery: { type: Number, min: 0, max: 100, default: null },
  approvedAt: { type: Date, default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", default: null },
  revokedAt: { type: Date, default: null },
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", default: null },
  revokeReason: { type: String, default: "", maxlength: 300 },
}, { timestamps: true });

driverDeviceSchema.index({ companyId: 1, installationIdHash: 1 }, { unique: true });
driverDeviceSchema.index({ companyId: 1, driverId: 1, status: 1 });

export default mongoose.models.DriverDevice || mongoose.model("DriverDevice", driverDeviceSchema);
