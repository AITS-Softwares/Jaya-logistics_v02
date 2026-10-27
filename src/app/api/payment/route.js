import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Payment from "@/models/Payment";
import SalesInvoice from "@/models/SalesInvoice";
import PurchaseInvoice from "@/models/InvoiceModel";
import { withAuth } from "@/lib/auth";
import { activeOperatingCompanyId, companyScopeFilter } from "@/lib/companyScope";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PAYMENT_MODES = new Set(["Cash", "Bank", "UPI", "Cheque", "Other"]);
const EPSILON = 0.01;

class PaymentValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "PaymentValidationError";
    this.status = status;
  }
}

function asPositiveAmount(value, label) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PaymentValidationError(`${label} must be greater than zero.`);
  }
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function asOptionalDate(value) {
  if (!value) return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new PaymentValidationError("Payment date is invalid.");
  return date;
}

function paymentMode(value) {
  const mode = String(value || "Cash").trim();
  if (!PAYMENT_MODES.has(mode)) throw new PaymentValidationError("Payment mode is invalid.");
  return mode;
}

function paymentModelForType(paymentType) {
  if (paymentType === "Customer") return "SalesInvoice";
  if (paymentType === "Supplier") return "PurchaseInvoice";
  throw new PaymentValidationError("Payment type must be Customer or Supplier.");
}

function modelForReference(model) {
  if (model === "SalesInvoice") return SalesInvoice;
  if (model === "PurchaseInvoice") return PurchaseInvoice;
  throw new PaymentValidationError("Payment reference has an invalid invoice type.");
}

function remainingInvoiceAmount(invoice) {
  const grandTotal = Number(invoice.grandTotal);
  const paidAmount = Number(invoice.paidAmount || 0);
  if (!Number.isFinite(grandTotal) || grandTotal < 0 || !Number.isFinite(paidAmount) || paidAmount < 0) {
    throw new PaymentValidationError("Referenced invoice has invalid balance data.", 409);
  }
  return Math.max(0, Math.round((grandTotal - paidAmount + Number.EPSILON) * 100) / 100);
}

function sourceParty(invoice, model) {
  if (model === "SalesInvoice") {
    return {
      code: String(invoice.customerCode || "").trim(),
      name: String(invoice.customerName || "").trim(),
    };
  }
  return {
    code: String(invoice.supplierCode || "").trim(),
    name: String(invoice.supplierName || "").trim(),
  };
}

function normalizeReferences(input, expectedModel) {
  if (!Array.isArray(input) || input.length === 0) {
    throw new PaymentValidationError("Select at least one invoice for this payment.");
  }

  const seen = new Set();
  return input.map((reference) => {
    const invoiceId = String(reference?.invoiceId || "").trim();
    if (!mongoose.isValidObjectId(invoiceId)) {
      throw new PaymentValidationError("Payment reference contains an invalid invoice ID.");
    }
    if (reference?.model !== expectedModel) {
      throw new PaymentValidationError("Payment references must match the selected payment type.");
    }
    if (seen.has(invoiceId)) {
      throw new PaymentValidationError("The same invoice cannot be selected twice.");
    }
    seen.add(invoiceId);
    return {
      invoiceId,
      model: expectedModel,
      paidAmount: asPositiveAmount(reference.paidAmount, "Referenced invoice payment"),
    };
  });
}

function safeText(value, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

/**
 * Records a local payment only after each linked local invoice has been found
 * inside the selected legal operating-company scope. ERPNext posting is
 * intentionally not performed here; a future outbox processor must run only
 * after this MongoDB transaction has committed.
 */
export const POST = withAuth(async (req, _context, user) => {
  let session;
  try {
    activeOperatingCompanyId(user);
    await dbConnect();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new PaymentValidationError("Payment data must be a JSON object.");
    }

    const paymentType = String(body.paymentType || "").trim();
    const expectedModel = paymentModelForType(paymentType);
    const references = normalizeReferences(body.references, expectedModel);
    const amount = asPositiveAmount(body.amount, "Payment amount");
    const referenceTotal = Math.round((references.reduce((total, reference) => total + reference.paidAmount, 0) + Number.EPSILON) * 100) / 100;
    if (Math.abs(amount - referenceTotal) > EPSILON) {
      throw new PaymentValidationError("Payment amount must equal the total allocated to invoices.");
    }

    session = await mongoose.startSession();
    session.startTransaction();

    let party = null;
    const storedReferences = [];

    for (const reference of references) {
      const InvoiceModel = modelForReference(reference.model);
      // This uses the same selected-company rule as the invoice routes. A JGL
      // user can see declared legacy JGL data; JL/NK can never see it.
      const invoice = await InvoiceModel.findOne(
        companyScopeFilter(user, { _id: reference.invoiceId })
      ).session(session);

      if (!invoice) {
        throw new PaymentValidationError("A referenced invoice is unavailable in the selected operating company.", 404);
      }

      const invoiceParty = sourceParty(invoice, reference.model);
      if (!invoiceParty.code && !invoiceParty.name) {
        throw new PaymentValidationError("Referenced invoice is missing party information.", 409);
      }
      if (party && (party.code !== invoiceParty.code || party.name !== invoiceParty.name)) {
        throw new PaymentValidationError("A payment can only be allocated to one customer or supplier.");
      }
      party = invoiceParty;

      const outstanding = remainingInvoiceAmount(invoice);
      if (reference.paidAmount - outstanding > EPSILON) {
        throw new PaymentValidationError("Payment allocation exceeds the referenced invoice balance.", 409);
      }

      invoice.paidAmount = Math.round(((Number(invoice.paidAmount || 0) + reference.paidAmount) + Number.EPSILON) * 100) / 100;
      invoice.remainingAmount = Math.max(0, Math.round(((Number(invoice.grandTotal) - invoice.paidAmount) + Number.EPSILON) * 100) / 100);
      invoice.paymentStatus = invoice.remainingAmount <= EPSILON
        ? "Paid"
        : invoice.paidAmount > 0 ? "Partial" : "Pending";
      if (invoice.paymentStatus === "Paid") invoice.remainingAmount = 0;

      await invoice.save({ session });
      storedReferences.push({
        invoiceId: invoice._id,
        model: reference.model,
        invoiceNumber: reference.model === "SalesInvoice"
          ? invoice.invoiceNumber
          : invoice.documentNumberPurchaseInvoice,
        paidAmount: reference.paidAmount,
        invoiceTotal: Number(invoice.grandTotal),
        invoiceDate: invoice.invoiceDate || invoice.documentDate || invoice.postingDate || null,
      });
    }

    const paymentPayload = {
      companyId: user.companyId,
      subCompanyId: user.activeOperatingCompanyId,
      subCompanyName: user.activeOperatingCompanyName || "",
      subCompanyCode: user.activeOperatingCompanyCode || "",
      createdBy: user.id || null,
      paymentDate: asOptionalDate(body.paymentDate || body.postDate),
      paymentType,
      amount,
      mode: paymentMode(body.mode || body.modeOfPayment),
      reference: safeText(body.reference, 200),
      remarks: safeText(body.remarks, 1000),
      references: storedReferences,
      status: "Completed",
    };

    if (paymentType === "Customer") {
      paymentPayload.customerCode = party?.code || "";
      paymentPayload.customerName = party?.name || "";
    } else {
      paymentPayload.supplierCode = party?.code || "";
      paymentPayload.supplierName = party?.name || "";
    }

    const [payment] = await Payment.create([paymentPayload], { session });
    await session.commitTransaction();

    return NextResponse.json({
      success: true,
      message: "Payment recorded",
      paymentId: payment._id,
      paymentNumber: payment.paymentNumber,
    }, { status: 201 });
  } catch (error) {
    if (session?.inTransaction()) await session.abortTransaction();
    const status = error instanceof PaymentValidationError ? error.status : 500;
    if (status >= 500) console.error("POST /api/payment error:", error);
    return NextResponse.json({
      success: false,
      message: error instanceof PaymentValidationError ? error.message : "Payment could not be recorded.",
    }, { status });
  } finally {
    if (session) session.endSession();
  }
}, { module: "Payment Entry", action: "create" });
