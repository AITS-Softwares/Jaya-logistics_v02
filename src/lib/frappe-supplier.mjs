import { createFrappeClient, isFrappeConfigured } from "@/lib/frappe-client.mjs";

function externalId(supplier) {
  return `JAYA-${supplier.companyId}-${supplier._id}`;
}

export function supplierPayload(supplier, env = process.env) {
  return {
    doctype: "Supplier",
    supplier_name: supplier.supplierName,
    supplier_type: supplier.supplierType || "Company",
    ...(env.FRAPPE_SUPPLIER_GROUP ? { supplier_group: env.FRAPPE_SUPPLIER_GROUP } : {}),
    ...(supplier.gstNumber ? { gstin: supplier.gstNumber } : {}),
    ...(supplier.pan ? { pan: supplier.pan } : {}),
  };
}

/** Idempotent master sync. Existing ERPNext party records are never duplicated. */
export async function syncSupplier(supplier, { env = process.env, fetchImpl = fetch } = {}) {
  if (supplier.approvalStatus !== 'Approved') return {status:'failed',message:'Supplier approval is required before sync.'};
  if (!env.FRAPPE_COMPANY_ID || String(supplier.companyId) !== String(env.FRAPPE_COMPANY_ID) || !isFrappeConfigured(env)) {
    return { status: "not_configured" };
  }
  try {
    const client = createFrappeClient({ env, fetchImpl });
    const idField = env.FRAPPE_SUPPLIER_ID_FIELD || "custom_jaya_supplier_id";
    const existing = await client.findByExternalId("Supplier", idField, externalId(supplier));
    const payload = supplierPayload(supplier, env);
    if (existing) {
      const updated = await client.update("Supplier", existing.name, payload);
      return { status: "synced", name: updated?.name || existing.name };
    }
    const result = await client.create("Supplier", { ...payload, [idField]: externalId(supplier) });
    const name = result?.name;
    if (!name) throw new Error("ERPNext did not return a Supplier name.");
    return { status: "synced", name };
  } catch (error) {
    return { status: "failed", message: error?.message || "ERPNext supplier sync failed" };
  }
}
