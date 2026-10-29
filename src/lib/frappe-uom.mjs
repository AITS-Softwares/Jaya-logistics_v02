import { createFrappeClient, isFrappeConfigured } from "@/lib/frappe-client.mjs";

export async function syncUom(uom, { env = process.env, fetchImpl = fetch } = {}) {
  if (!env.FRAPPE_COMPANY_ID || String(uom.companyId) !== String(env.FRAPPE_COMPANY_ID) || !isFrappeConfigured(env)) return { status: "not_configured" };
  try {
    const client = createFrappeClient({ env, fetchImpl });
    const rows = await client.list("UOM", { fields: ["name", "uom_name"], filters: [["uom_name", "=", uom.name]], limitPageLength: 2 });
    if (rows.length > 1) throw new Error("ERPNext has duplicate UOM names; manual review is required.");
    if (rows[0]) return { status: "synced", name: rows[0].name };
    const result = await client.create("UOM", { doctype: "UOM", uom_name: uom.name, must_be_whole_number: 0, enabled: 1 });
    if (!result?.name) throw new Error("ERPNext did not return a UOM name.");
    return { status: "synced", name: result.name };
  } catch (error) { return { status: "failed", message: error?.message || "ERPNext UOM sync failed" }; }
}
