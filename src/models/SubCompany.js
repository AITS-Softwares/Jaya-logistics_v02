import mongoose from "mongoose";

const legalProfileSchema = new mongoose.Schema(
  {
    legalName: { type: String, trim: true, default: "" },
    gstNumber: { type: String, uppercase: true, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    pinCode: { type: String, trim: true, default: "" },
    bankName: { type: String, trim: true, default: "" },
    bankAccountName: { type: String, trim: true, default: "" },
    bankAccountNumber: { type: String, trim: true, default: "" },
    bankIfsc: { type: String, uppercase: true, trim: true, default: "" },
    documentPrefix: { type: String, uppercase: true, trim: true, default: "" },
  },
  { _id: false }
);

const subCompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", default: null },
    isActive: { type: Boolean, default: true },
    // Existing sub-company records remain supported. This flag identifies the
    // legal entities that may be selected at internal user login.
    isOperatingCompany: { type: Boolean, default: false },
    legalProfile: { type: legalProfileSchema, default: () => ({}) },
  },
  { timestamps: true }
);

subCompanySchema.index({ companyId: 1, isOperatingCompany: 1, isActive: 1 });
subCompanySchema.index({ companyId: 1, name: 1 });

export default mongoose.models.SubCompany || mongoose.model("SubCompany", subCompanySchema);
