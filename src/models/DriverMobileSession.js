import mongoose from "mongoose";

const driverMobileSessionSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "DriverProfile", required: true, index: true },
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: "DriverDevice", default: null, index: true },
  familyId: { type: String, required: true, index: true },
  refreshTokenHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true },
  lastUsedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
  revokeReason: { type: String, default: "", maxlength: 120 },
}, { timestamps: true });

driverMobileSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.DriverMobileSession || mongoose.model("DriverMobileSession", driverMobileSessionSchema);
