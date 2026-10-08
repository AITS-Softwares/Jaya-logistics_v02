import mongoose from "mongoose";

const stopSchema = new mongoose.Schema({
  sequence: { type: Number, required: true },
  type: { type: String, enum: ["pickup", "drop"], required: true },
  label: { type: String, default: "" },
  address: { type: String, default: "" },
  city: { type: String, default: "" },
  pinCode: { type: String, default: "" },
  status: { type: String, enum: ["pending", "arrived", "completed"], default: "pending" },
}, { _id: false });

const driverTripSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  loadingId: { type: mongoose.Schema.Types.ObjectId, ref: "LoadingPanel", required: true, index: true },
  loadingReference: { type: String, required: true, trim: true },
  lrIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "ConsignmentNote" }],
  lrNumbers: [{ type: String }],
  vehicle: {
    vehicleId: { type: String, default: "" },
    vehicleNo: { type: String, required: true },
  },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "DriverProfile", required: true, index: true },
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: "DriverDevice", default: null },
  routeSnapshot: {
    stops: { type: [stopSchema], default: [] },
    plannedAt: { type: Date, default: Date.now },
    routeBaseline: {
      distanceKm: { type: Number, default: null },
      durationMinutes: { type: Number, default: null },
      expectedDays: { type: Number, default: null },
      approvedAt: { type: Date, default: null },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", default: null },
    },
  },
  state: { type: String, enum: ["assigned", "started", "at_pickup", "in_transit", "at_stop", "delivered", "completed", "cancelled"], default: "assigned", index: true },
  nextStopIndex: { type: Number, default: 0 },
  issueStatus: { type: String, default: null },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  cancelReason: { type: String, default: "", maxlength: 300 },
  version: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", default: null },
}, { timestamps: true });

driverTripSchema.index({ companyId: 1, driverId: 1, state: 1, updatedAt: -1 });
driverTripSchema.index({ companyId: 1, "vehicle.vehicleNo": 1, state: 1 });

export default mongoose.models.DriverTrip || mongoose.model("DriverTrip", driverTripSchema);
