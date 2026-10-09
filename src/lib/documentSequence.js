import mongoose from "mongoose";

// One counter collection for every legal company, document type and financial
// year. `findOneAndUpdate` makes allocation atomic even when two users save at
// exactly the same time. Never replace this with a countDocuments() sequence.
const schema = new mongoose.Schema({
  _id: { type: String, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  subCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: "SubCompany", required: true },
  documentType: { type: String, required: true },
  financialYear: { type: String, required: true },
  sequence: { type: Number, default: 0 },
}, { timestamps: true });

schema.index({ companyId: 1, subCompanyId: 1, documentType: 1, financialYear: 1 }, { unique: true });

const DocumentSequence = mongoose.models.DocumentSequence || mongoose.model("DocumentSequence", schema);

export function financialYearFor(date = new Date()) {
  const year = date.getFullYear();
  const start = date.getMonth() >= 3 ? year : year - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

export async function nextCompanyDocumentNumber({ companyId, subCompanyId, subCompanyCode, documentType, width = 5, financialYear = financialYearFor() }) {
  if (!companyId || !subCompanyId || !subCompanyCode || !documentType) {
    throw new Error("Company-specific document sequence requires company and operating-company details.");
  }
  const safeCode = String(subCompanyCode).trim().toUpperCase();
  const key = `${companyId}:${subCompanyId}:${documentType}:${financialYear}`;
  const counter = await DocumentSequence.findOneAndUpdate(
    { _id: key },
    {
      $inc: { sequence: 1 },
      $setOnInsert: { companyId, subCompanyId, documentType, financialYear },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `${safeCode}-${documentType}-${financialYear}-${String(counter.sequence).padStart(width, "0")}`;
}

// Simple per-company running number, no year, never resets:  JGL-ORD-0001
export async function nextSimpleDocumentNumber({ companyId, subCompanyId, subCompanyCode, documentType, width = 4 }) {
  if (!companyId || !subCompanyId || !subCompanyCode || !documentType) {
    throw new Error("Company-specific document sequence requires company and operating-company details.");
  }
  const code = String(subCompanyCode).trim().toUpperCase();
  const financialYear = "ALL"; // fixed value = one continuous series, no year
  const key = `${companyId}:${subCompanyId}:${documentType}:${financialYear}`;
  const counter = await DocumentSequence.findOneAndUpdate(
    { _id: key },
    { $inc: { sequence: 1 }, $setOnInsert: { companyId, subCompanyId, documentType, financialYear } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `${code}-${documentType}-${String(counter.sequence).padStart(width, "0")}`;
}

/**
 * Yearly series: <CODE>-<TYPE>-<calendar year>-<number>, e.g. JGL-LD-2026-0014.
 * The number is padded to `width` digits and grows on its own (9999 -> 10000 -> 100000).
 * `seed()` is called only when the counter for that year does not exist yet, so an existing
 * series carries on after its highest number instead of restarting at 1.
 */
export async function nextYearlyDocumentNumber({ companyId, subCompanyId, subCompanyCode, documentType, width = 4, year = new Date().getFullYear(), seed }) {
  if (!companyId || !subCompanyId || !subCompanyCode || !documentType) {
    throw new Error("Company-specific document sequence requires company and operating-company details.");
  }
  const code = String(subCompanyCode).trim().toUpperCase();
  const financialYear = String(year); // the existing field holds the calendar year here
  const key = `${companyId}:${subCompanyId}:${documentType}:${financialYear}`;

  if (typeof seed === "function" && !(await DocumentSequence.exists({ _id: key }))) {
    const start = Number(await seed()) || 0;
    try {
      await DocumentSequence.updateOne(
        { _id: key },
        { $setOnInsert: { companyId, subCompanyId, documentType, financialYear, sequence: start } },
        { upsert: true }
      );
    } catch (e) {
      if (e?.code !== 11000) throw e; // another request created it first
    }
  }

  const counter = await DocumentSequence.findOneAndUpdate(
    { _id: key },
    { $inc: { sequence: 1 }, $setOnInsert: { companyId, subCompanyId, documentType, financialYear } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `${code}-${documentType}-${financialYear}-${String(counter.sequence).padStart(width, "0")}`;
}

export function companyPrefix(user) {
  const code = String(user?.activeOperatingCompanyCode || "").trim().toUpperCase();
  if (!code) throw new Error("An operating company must be selected before creating a document.");
  return code;
}

export default DocumentSequence;
