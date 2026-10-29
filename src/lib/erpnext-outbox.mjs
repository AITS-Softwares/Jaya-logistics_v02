import crypto from "node:crypto";
import ErpNextIntegrationMapping from "@/models/ErpNextIntegrationMapping";
import ErpNextIntegrationOutbox from "@/models/ErpNextIntegrationOutbox";

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((result, key) => {
      if (value[key] !== undefined) result[key] = stableValue(value[key]);
      return result;
    }, {});
  }
  return value;
}

export function stablePayloadHash(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(stableValue(payload))).digest("hex");
}

export function integrationExternalId({ localDoctype, localRecordId, subCompanyCode }) {
  return `JAYA-${String(subCompanyCode || "UNKNOWN").trim().toUpperCase()}-${String(localDoctype).replace(/[^A-Za-z0-9]/g, "").toUpperCase()}-${String(localRecordId)}`.slice(0, 200);
}

function required(value, label) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

/** Creates one retry-safe operation and its identity mapping. */
export async function enqueueErpNextExport(input, { session } = {}) {
  const companyId = required(input.companyId, "companyId");
  const subCompanyId = required(input.subCompanyId, "subCompanyId");
  const localDoctype = required(input.localDoctype, "localDoctype");
  const localRecordId = required(input.localRecordId, "localRecordId");
  const erpNextCompany = required(input.erpNextCompany, "erpNextCompany");
  const erpNextDoctype = required(input.erpNextDoctype, "erpNextDoctype");
  const eventType = required(input.eventType, "eventType");
  if (!input.payloadSnapshot || typeof input.payloadSnapshot !== "object" || Array.isArray(input.payloadSnapshot)) {
    throw new Error("A payload snapshot is required.");
  }

  const sourceHash = stablePayloadHash(input.payloadSnapshot);
  const externalId = integrationExternalId(input);
  const idempotencyKey = `${eventType}:${externalId}:${sourceHash}`;
  const mappingFilter = { companyId, subCompanyId, localDoctype, localRecordId, erpNextDoctype };
  const options = { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true, ...(session ? { session } : {}) };

  const mapping = await ErpNextIntegrationMapping.findOneAndUpdate(mappingFilter, {
    $set: { erpNextCompany, externalId, sourceHash, status: "queued", lastError: "" },
    $setOnInsert: { syncVersion: 1 },
  }, options);

  const outbox = await ErpNextIntegrationOutbox.findOneAndUpdate(
    { companyId, idempotencyKey },
    {
      $setOnInsert: {
        companyId, subCompanyId, localDoctype, localRecordId, erpNextCompany,
        erpNextDoctype, eventType, idempotencyKey, sourceHash,
        payloadSnapshot: stableValue(input.payloadSnapshot), createdBy: input.createdBy || null,
      },
    },
    options,
  );
  return { mapping, outbox, sourceHash, externalId, idempotencyKey, created: outbox.createdAt?.valueOf?.() === outbox.updatedAt?.valueOf?.() };
}

export async function blockErpNextExport(input, error, { session } = {}) {
  const message = String(error?.message || error || "ERPNext export is blocked.").replace(/\s+/g, " ").trim().slice(0, 500);
  return ErpNextIntegrationMapping.findOneAndUpdate({
    companyId: required(input.companyId, "companyId"),
    subCompanyId: required(input.subCompanyId, "subCompanyId"),
    localDoctype: required(input.localDoctype, "localDoctype"),
    localRecordId: required(input.localRecordId, "localRecordId"),
    erpNextDoctype: required(input.erpNextDoctype, "erpNextDoctype"),
  }, {
    $set: { erpNextCompany: required(input.erpNextCompany, "erpNextCompany"), status: "blocked", lastError: message },
  }, { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true, ...(session ? { session } : {}) });
}
