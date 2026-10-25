import mongoose from "mongoose";

const auditSchema = new mongoose.Schema({
  action: { type: String, required: true },
  by: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", default: null },
  at: { type: Date, default: Date.now },
  details: { type: String, default: "" },
}, { _id: false });

const driverMobileConfigSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, unique: true, index: true },
  enabled: { type: Boolean, default: false },
  rolloutMode: { type: String, enum: ["pilot", "production"], default: "pilot" },
  pilotMobiles: { type: [String], default: [] },
  encryptedJwtSecret: { type: String, default: "", select: false },
  movingIntervalSec: { type: Number, default: 30, min: 15, max: 300 },
  minDistanceM: { type: Number, default: 100, min: 25, max: 2000 },
  audit: { type: [auditSchema], default: [] },
}, { timestamps: true });

export default mongoose.models.DriverMobileConfig || mongoose.model("DriverMobileConfig", driverMobileConfigSchema);
