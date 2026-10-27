import mongoose from "mongoose";

const { Schema } = mongoose;

// This is a small display/cache pointer only. Detailed ERPNext attempts live
// in ErpNextSyncLog so credentials, payloads and raw responses never become
// part of a financial document.
const ERPNextPaymentReferenceSchema = new Schema(
  {
    company: { type: String, trim: true, default: "" },
    doctype: { type: String, trim: true, default: "Payment Entry" },
    name: { type: String, trim: true, default: "" },
    docstatus: { type: Number, min: 0, max: 2, default: null },
    syncStatus: {
      type: String,
      enum: ["not_started", "pending", "processing", "synced", "failed", "requires_review"],
      default: "not_started",
    },
    lastSyncedAt: { type: Date, default: null },
    lastError: { type: String, trim: true, default: "", maxlength: 500 },
  },
  { _id: false }
);

// Payment Reference Schema (linked to an invoice)
const PaymentReferenceSchema = new Schema(
  {
    
    invoiceId: { type: Schema.Types.ObjectId, required: true, refPath: "references.model" },
    model: { type: String, required: true, enum: ["SalesInvoice", "PurchaseInvoice"] },
    invoiceNumber: { type: String }, // for display
    paidAmount: { type: Number, required: true },
    invoiceTotal: { type: Number },
    invoiceDate: { type: Date }
  },
  { _id: false }
);

// Main Payment Schema
const PaymentSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, ref: "Company" },
    // Every new payment is owned by the legal operating company selected in
    // the authenticated workspace. Records without this value remain legacy
    // JGL records only through the explicit companyScopeFilter fallback.
    subCompanyId: { type: Schema.Types.ObjectId, ref: "SubCompany", default: null, index: true },
    subCompanyName: { type: String, trim: true, default: "" },
    subCompanyCode: { type: String, trim: true, uppercase: true, default: "" },
    createdBy: { type: Schema.Types.ObjectId,  ref: "User" },
    paymentNumber: { type: String, unique: true },
    paymentDate: { type: Date, default: Date.now },

    // Payer/Payee info
    paymentType: { type: String, enum: ["Customer", "Supplier"], required: true },
    customerCode: { type: String },
    customerName: { type: String },
    supplierCode: { type: String },
    supplierName: { type: String },

    amount: { type: Number, required: true },
    mode: { type: String, enum: ["Cash", "Bank", "UPI", "Cheque", "Other"], default: "Cash" },
    reference: { type: String }, // UTR number, Cheque No., etc.
    remarks: { type: String },

    // List of invoices this payment is applied to
    references: { type: [PaymentReferenceSchema], default: [] },

    erpNext: { type: ERPNextPaymentReferenceSchema, default: () => ({}) },

    status: {
      type: String,
      enum: ["Pending", "Completed", "Cancelled"],
      default: "Completed"
    }
  },
  { timestamps: true }
);

PaymentSchema.index({ companyId: 1, subCompanyId: 1, paymentDate: -1 });

// Auto-generate payment number (like PAY-001)
PaymentSchema.pre("save", async function (next) {
  if (!this.paymentNumber) {
    const Counter = await import("./Counter.js");
    try {
      const counter = await Counter.default.findOneAndUpdate(
        { id: "payment" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.paymentNumber = `PAY-${String(counter.seq).padStart(3, "0")}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

export default mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
