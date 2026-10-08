import mongoose from "mongoose";

const trackingSessionSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: "DriverTrip", required: true, index: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "DriverProfile", required: true },
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: "DriverDevice", required: true },
  state: { type: String, enum: ["active", "paused", "ended", "stale"], default: "active", index: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
  lastSequence: { type: Number, default: 0 },
  lastRecordedAt: { type: Date, default: null },
}, { timestamps: true });

trackingSessionSchema.index({ companyId: 1, tripId: 1, state: 1 });

export default mongoose.models.TrackingSession || mongoose.model("TrackingSession", trackingSessionSchema);
