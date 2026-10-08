import mongoose from "mongoose";

const driverProfileSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  displayName: { type: String, required: true, trim: true, maxlength: 120 },
  mobileE164: { type: String, required: true, trim: true },
  pinHash: { type: String, default: null, select: false },
  employeeOrVendorRef: { type: String, default: "", trim: true },
  preferredLanguage: { type: String, default: "en", trim: true, maxlength: 12 },
  status: { type: String, enum: ["active", "suspended", "archived"], default: "active", index: true },
  consentVersion: { type: String, default: "" },
  consentAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", default: null },
}, { timestamps: true });

driverProfileSchema.index({ companyId: 1, mobileE164: 1 }, { unique: true });

export default mongoose.models.DriverProfile || mongoose.model("DriverProfile", driverProfileSchema);
