import mongoose from "mongoose";

const driverProfileSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  displayName: { type: String, required: true, trim: true, maxlength: 120 },
  mobileE164: { type: String, required: true, trim: true },
  mobileHistory: [{
    mobileE164: { type: String, required: true, trim: true },
    releasedAt: { type: Date, required: true },
    releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
    reason: { type: String, default: "", maxlength: 300 },
  }],
  pinHash: { type: String, default: null, select: false },
  employeeOrVendorRef: { type: String, default: "", trim: true },
  // These fields are deliberately kept on the existing driver profile.  A
  // separate mobile-only driver collection would create duplicate identities
  // once VNN and Loading Info begin creating/updating drivers in later phases.
  licenseNumber: { type: String, default: "", trim: true, maxlength: 80 },
  mobileAccessStatus: {
    type: String,
    enum: ["not_registered", "enabled", "disabled"],
    default: "not_registered",
    index: true,
  },
  mobileAccessEnabled: { type: Boolean, default: false, index: true },
  passwordChangeRequired: { type: Boolean, default: false },
  passwordSetAt: { type: Date, default: null },
  mobileAccessUpdatedAt: { type: Date, default: null },
  mobileAccessUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", default: null },
  registrationStatus: { type: String, enum: ["draft", "registered"], default: "draft", index: true },
  firstOperationalSource: { type: String, enum: ["", "vnn", "loading"], default: "" },
  lastOperationalSource: { type: String, enum: ["", "vnn", "loading"], default: "" },
  lastOperationalReference: { type: String, default: "", trim: true, maxlength: 120 },
  lastOperationalSyncAt: { type: Date, default: null },
  preferredLanguage: { type: String, default: "en", trim: true, maxlength: 12 },
  status: { type: String, enum: ["active", "suspended", "archived"], default: "active", index: true },
  consentVersion: { type: String, default: "" },
  consentAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", default: null },
}, { timestamps: true });

driverProfileSchema.index({ companyId: 1, mobileE164: 1 }, { unique: true });

export default mongoose.models.DriverProfile || mongoose.model("DriverProfile", driverProfileSchema);
