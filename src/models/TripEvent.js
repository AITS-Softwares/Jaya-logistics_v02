import mongoose from "mongoose";

const tripEventSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: "DriverTrip", required: true, index: true },
  type: { type: String, required: true, maxlength: 80 },
  source: { type: String, enum: ["driver", "dispatcher", "system"], required: true },
  idempotencyKey: { type: String, required: true, maxlength: 120 },
  occurredAt: { type: Date, default: Date.now },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdByDriverId: { type: mongoose.Schema.Types.ObjectId, ref: "DriverProfile", default: null },
  createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", default: null },
}, { timestamps: true });

tripEventSchema.index({ tripId: 1, idempotencyKey: 1 }, { unique: true });
tripEventSchema.index({ companyId: 1, tripId: 1, occurredAt: -1 });

export default mongoose.models.TripEvent || mongoose.model("TripEvent", tripEventSchema);
