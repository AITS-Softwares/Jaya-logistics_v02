import mongoose from "mongoose";

const stopEpisodeSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: "DriverTrip", required: true, index: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "TrackingSession", required: true },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
  centre: { latitude: Number, longitude: Number },
  durationSec: { type: Number, default: 0 },
  classification: { type: String, enum: ["traffic", "fuel", "meal", "overnight", "customer_wait", "breakdown", "unknown"], default: "unknown" },
  confidence: { type: Number, default: 0, min: 0, max: 1 },
  confirmedByDriver: { type: Boolean, default: false },
  linkedStopIndex: { type: Number, default: null },
}, { timestamps: true });

stopEpisodeSchema.index({ companyId: 1, tripId: 1, startedAt: -1 });

export default mongoose.models.StopEpisode || mongoose.model("StopEpisode", stopEpisodeSchema);
