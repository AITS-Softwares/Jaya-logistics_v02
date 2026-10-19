// src/models/SacCodeModel.js
import mongoose from "mongoose";

const SacCodeSchema = new mongoose.Schema(
    {
        companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
        code: { type: String, required: true, trim: true },
        description: { type: String, default: "", trim: true },
        isActive: { type: Boolean, default: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
    },
    { timestamps: true }
);
SacCodeSchema.index({ companyId: 1, code: 1 }, { unique: true });

export default mongoose.models.SacCode || mongoose.model("SacCode", SacCodeSchema);