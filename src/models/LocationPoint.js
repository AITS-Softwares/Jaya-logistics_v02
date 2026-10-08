import mongoose from "mongoose";

const locationPointSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "TrackingSession", required: true, index: true },
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: "DriverTrip", required: true, index: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "DriverProfile", required: true },
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: "DriverDevice", required: true },
  sequence: { type: Number, required: true, min: 1 },
  idempotencyKey: { type: String, required: true, maxlength: 120 },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  accuracyM: { type: Number, required: true, min: 0, max: 10000 },
  speedMps: { type: Number, default: null, min: 0, max: 120 },
  bearingDeg: { type: Number, default: null, min: 0, max: 360 },
  altitudeM: { type: Number, default: null, min: -1000, max: 15000 },
  recordedAt: { type: Date, required: true, index: true },
  receivedAt: { type: Date, default: Date.now },
  batteryPct: { type: Number, default: null, min: 0, max: 100 },
  isCharging: { type: Boolean, default: null },
  networkType: { type: String, default: "", maxlength: 32 },
  provider: { type: String, default: "", maxlength: 32 },
  isMocked: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
}, { timestamps: false });

locationPointSchema.index({ sessionId: 1, idempotencyKey: 1 }, { unique: true });
locationPointSchema.index({ sessionId: 1, sequence: 1 }, { unique: true });
locationPointSchema.index({ companyId: 1, tripId: 1, recordedAt: -1 });
locationPointSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.LocationPoint || mongoose.model("LocationPoint", locationPointSchema);
