import { createFrappeClient, isFrappeConfigured } from "@/lib/frappe-client.mjs";
export async function syncItemGroup(group, { env = process.env, fetchImpl = fetch } = {}) {
  const parent = String(env.FRAPPE_ITEM_GROUP_PARENT || "").trim();
  if (!env.FRAPPE_COMPANY_ID || String(group.companyId) !== String(env.FRAPPE_COMPANY_ID) || !parent || !isFrappeConfigured(env)) return { status: "not_configured", message: "Configure FRAPPE_ITEM_GROUP_PARENT before syncing Item Groups." };
  try {
    const client = createFrappeClient({ env, fetchImpl });
    const rows = await client.list("Item Group", { fields: ["name"], filters: [["item_group_name", "=", group.name]], limitPageLength: 2 });
    if (rows.length > 1) throw new Error("ERPNext has duplicate Item Group names; manual review is required.");
    if (rows[0]) return { status: "synced", name: rows[0].name };
    const result = await client.create("Item Group", { doctype: "Item Group", item_group_name: group.name, parent_item_group: parent, is_group: 0 });
    if (!result?.name) throw new Error("ERPNext did not return an Item Group name.");
    return { status: "synced", name: result.name };
  } catch (error) { return { status: "failed", message: error?.message || "ERPNext Item Group sync failed" }; }
}
