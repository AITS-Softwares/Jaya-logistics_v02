import crypto from "node:crypto";
import ErpNextInboundEvent from "@/models/ErpNextInboundEvent";
import ErpNextIntegrationMapping from "@/models/ErpNextIntegrationMapping";
import SalesInvoice from "@/models/SalesInvoice";
import PurchaseInvoice from "@/models/InvoiceModel";
import Payment from "@/models/Payment";

const ALLOWED_DOCTYPES = new Set(["Sales Invoice", "Purchase Invoice", "Payment Entry"]);
const LOCAL_MODELS = { SalesInvoice, PurchaseInvoice, Payment };

export function verifyErpNextWebhookSignature(rawBody, signature, secret) {
  const expected = crypto.createHmac("sha256", String(secret || "")).update(rawBody).digest("hex");
  const given = String(signature || "").trim().replace(/^sha256=/i, "");
  if (!secret || !/^[a-f0-9]{64}$/i.test(given)) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(given, "hex"));
}

function eventId(payload, rawBody) {
  return String(payload?.event_id || payload?.eventId || crypto.createHash("sha256").update(rawBody).digest("hex")).slice(0, 200);
}

function text(value) { return String(value || "").trim(); }

export async function processErpNextInboundStatus(payload, rawBody) {
  const erpNextDoctype = text(payload?.doctype);
  const erpNextName = text(payload?.name);
  const erpNextCompany = text(payload?.company);
  const docstatus = Number(payload?.docstatus);
  if (!ALLOWED_DOCTYPES.has(erpNextDoctype) || !erpNextName || !Number.isInteger(docstatus) || docstatus < 0 || docstatus > 2) {
    throw new Error("Inbound ERPNext event has unsupported or incomplete status data.");
  }
  const hash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const providerEventId = eventId(payload, rawBody);
  const inbound = await ErpNextInboundEvent.findOneAndUpdate(
    { providerEventId },
    { $setOnInsert: { providerEventId, eventHash: hash, erpNextDoctype, erpNextName, erpNextCompany, docstatus, signatureValid: true } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  if (inbound.eventHash !== hash) {
    await ErpNextInboundEvent.updateOne({ _id: inbound._id }, { $set: { state: "failed", error: "The same ERPNext event ID was received with different content." } });
    throw new Error("ERPNext event ID collision detected.");
  }
  if (inbound.state === "processed") return { duplicate: true, state: "processed" };

  const mapping = await ErpNextIntegrationMapping.findOne({ erpNextDoctype, erpNextName, ...(erpNextCompany ? { erpNextCompany } : {}) });
  if (!mapping) {
    await ErpNextInboundEvent.updateOne({ _id: inbound._id }, { $set: { state: "ignored", error: "No local mapping exists for this ERPNext document." } });
    return { duplicate: false, state: "ignored" };
  }
  const Model = LOCAL_MODELS[mapping.localDoctype];
  if (!Model) throw new Error("Inbound ERPNext event maps to an unsupported local document.");
  const status = docstatus === 2 ? "requires_review" : docstatus === 1 ? "synced" : "pending";
  await Promise.all([
    Model.updateOne({ _id: mapping.localRecordId, companyId: mapping.companyId }, {
      $set: { "erpNext.name": erpNextName, "erpNext.docstatus": docstatus, "erpNext.syncStatus": status, "erpNext.lastSyncedAt": new Date() },
    }),
    ErpNextIntegrationMapping.updateOne({ _id: mapping._id }, {
      $set: { status: docstatus === 2 ? "correction_requested" : "synced", lastSyncedAt: new Date(), lastError: "" },
    }),
    ErpNextInboundEvent.updateOne({ _id: inbound._id }, { $set: { state: "processed", mappingId: mapping._id, error: "" } }),
  ]);
  return { duplicate: false, state: "processed", localDoctype: mapping.localDoctype, localRecordId: mapping.localRecordId };
}
