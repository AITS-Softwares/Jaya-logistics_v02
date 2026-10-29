import ErpNextIntegrationOutbox from "@/models/ErpNextIntegrationOutbox";
import ErpNextIntegrationMapping from "@/models/ErpNextIntegrationMapping";
import SalesInvoice from "@/models/SalesInvoice";
import PurchaseInvoice from "@/models/InvoiceModel";
import Payment from "@/models/Payment";
import SubCompany from "@/models/SubCompany";
import { assertOperatingCompanyFrappeReady } from "@/lib/frappe-company-config.mjs";
import { createFrappeClient, isFrappeConfigured } from "@/lib/frappe-client.mjs";

const sourceModels = {
  SalesInvoice,
  PurchaseInvoice,
  Payment,
};

function externalIdField(doctype, env) {
  if (doctype === "Sales Invoice") return String(env.FRAPPE_SALES_INVOICE_ID_FIELD || "").trim();
  if (doctype === "Purchase Invoice") return String(env.FRAPPE_PURCHASE_INVOICE_ID_FIELD || "").trim();
  if (doctype === "Payment Entry") return String(env.FRAPPE_PAYMENT_ENTRY_ID_FIELD || "").trim();
  return "";
}

function retryAt(attempts) {
  const minutes = Math.min(60, 2 ** Math.min(Math.max(attempts, 0), 5));
  return new Date(Date.now() + minutes * 60_000);
}

function safeError(error) {
  return String(error?.message || "ERPNext export failed.").replace(/\s+/g, " ").trim().slice(0, 500);
}

async function setSourceStatus(outbox, patch) {
  const Model = sourceModels[outbox.localDoctype];
  if (!Model) return;
  await Model.updateOne({ _id: outbox.localRecordId, companyId: outbox.companyId }, { $set: Object.fromEntries(
    Object.entries(patch).map(([key, value]) => [`erpNext.${key}`, value]),
  ) });
}

/**
 * Processes exactly one persisted operation. It is deliberately invoked by a
 * protected route/worker rather than a browser and never bypasses the global
 * + per-company accounting pilot gates.
 */
export async function processErpNextOutboxById({ outboxId, companyId, subCompanyId, env = process.env, fetchImpl = fetch }) {
  const outbox = await ErpNextIntegrationOutbox.findOneAndUpdate({
    _id: outboxId,
    companyId,
    subCompanyId,
    state: { $in: ["queued", "retry_pending"] },
  }, {
    $set: { state: "processing", workerLock: `manual-${Date.now()}`, lockedAt: new Date(), lastError: "" },
    $inc: { attempts: 1 },
  }, { new: true });

  if (!outbox) throw new Error("The export is not queued, is unavailable, or is already being processed.");

  try {
    const operatingCompany = await SubCompany.findOne({
      _id: outbox.subCompanyId,
      companyId: outbox.companyId,
      isOperatingCompany: true,
      isActive: true,
    }).lean();
    if (!operatingCompany) throw new Error("The local operating company is unavailable.");
    const config = assertOperatingCompanyFrappeReady(operatingCompany, { env });
    if (!isFrappeConfigured(env)) throw new Error("ERPNext connection is not configured.");
    if (config.erpnextCompany !== outbox.erpNextCompany) throw new Error("The queued ERPNext Company no longer matches the approved operating-company mapping.");

    const idField = externalIdField(outbox.erpNextDoctype, env);
    if (!idField) throw new Error(`A duplicate-safe external ID field is required for ${outbox.erpNextDoctype}.`);
    const externalId = String(outbox.payloadSnapshot?.[idField] || "").trim();
    if (!externalId) throw new Error("The queued export does not contain its external ID.");

    const client = createFrappeClient({ env, fetchImpl });
    let remote = await client.findByExternalId(outbox.erpNextDoctype, idField, externalId);
    if (!remote) remote = await client.create(outbox.erpNextDoctype, outbox.payloadSnapshot);
    if (!remote?.name) throw new Error("ERPNext did not return a document name.");
    if (Number(remote.docstatus || 0) === 0) remote = await client.submit(outbox.erpNextDoctype, remote.name);

    const now = new Date();
    await Promise.all([
      ErpNextIntegrationOutbox.updateOne({ _id: outbox._id }, {
        $set: { state: "synced", erpNextName: remote.name, workerLock: "", lockedAt: null, nextAttemptAt: null, lastError: "" },
      }),
      ErpNextIntegrationMapping.updateOne({
        companyId: outbox.companyId, subCompanyId: outbox.subCompanyId, localDoctype: outbox.localDoctype,
        localRecordId: outbox.localRecordId, erpNextDoctype: outbox.erpNextDoctype,
      }, {
        $set: { status: "synced", erpNextName: remote.name, lastSyncedAt: now, lastError: "" },
      }),
      setSourceStatus(outbox, { name: remote.name, docstatus: Number(remote.docstatus ?? 1), syncStatus: "synced", lastSyncedAt: now, lastError: "" }),
    ]);
    return { state: "synced", erpNextName: remote.name, docstatus: Number(remote.docstatus ?? 1) };
  } catch (error) {
    const retryable = error?.retryable === true;
    const state = retryable ? "retry_pending" : "blocked";
    const message = safeError(error);
    await Promise.all([
      ErpNextIntegrationOutbox.updateOne({ _id: outbox._id }, {
        $set: { state, lastError: message, workerLock: "", lockedAt: null, nextAttemptAt: retryable ? retryAt(outbox.attempts) : null },
      }),
      ErpNextIntegrationMapping.updateOne({
        companyId: outbox.companyId, subCompanyId: outbox.subCompanyId, localDoctype: outbox.localDoctype,
        localRecordId: outbox.localRecordId, erpNextDoctype: outbox.erpNextDoctype,
      }, { $set: { status: state === "blocked" ? "blocked" : "retry_pending", lastError: message } }),
      setSourceStatus(outbox, { syncStatus: state === "blocked" ? "requires_review" : "pending", lastError: message }),
    ]);
    throw error;
  }
}
