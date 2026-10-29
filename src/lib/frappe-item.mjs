import { createFrappeClient, isFrappeConfigured } from "@/lib/frappe-client.mjs";

const DEFAULT_ITEM_GROUP = 'Products';
const UOM_MAP = {
  KG: 'Kg',
  MTP: 'Tonne',
  PC: 'Nos',
  LTR: 'Litre',
  MTR: 'Meter',
};

// Existing fertilizer records do not carry an HSN value locally. 3105 is a
// valid Frappe GST HSN Code for fertilizer goods; other categories still need
// an explicit local or environment mapping.
const DEFAULT_HSN_BY_CATEGORY = { fertilizer: '3105' };

function mappedItemGroup(item, env) {
  const configured = env.FRAPPE_ITEM_GROUP_MAP && JSON.parse(env.FRAPPE_ITEM_GROUP_MAP);
  return configured?.[item.category] || env.FRAPPE_ITEM_GROUP || DEFAULT_ITEM_GROUP;
}

function mappedUom(item) {
  return UOM_MAP[String(item.uom || '').trim().toUpperCase()] || item.uom || 'Nos';
}

function mappedHsn(item, env) {
  let configured = {};
  try { configured = env.FRAPPE_HSN_SAC_MAP ? JSON.parse(env.FRAPPE_HSN_SAC_MAP) : {}; } catch { /* Ignore an invalid optional map. */ }
  const category = String(item.category || '').trim();
  return item.gstCode || configured[category] || configured[category.toLowerCase()] || DEFAULT_HSN_BY_CATEGORY[category.toLowerCase()] || env.FRAPPE_HSN_SAC;
}

function frappeValidationMessage(body) {
  const raw = body?._server_messages || body?.message || body?.exc || body?.exception;
  if (!raw) return '';
  let value = raw;
  try { value = JSON.parse(value); } catch { /* Frappe may return plain text. */ }
  if (Array.isArray(value)) value = value.map(entry => {
    try { return JSON.parse(entry)?.message || entry; } catch { return entry; }
  }).join(' ');
  const text = String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, 180);
}

export function itemPayload(item, env) {
  const batchManaged = Boolean(item.batchNumber) || String(item.managedBy || '').toLowerCase() === 'batch';
  return {
    doctype: 'Item',
    item_code: item.itemCode,
    // Frappe permits Item Name to follow Item Code when it is not supplied.
    item_name: item.itemName || item.itemCode,
    item_group: mappedItemGroup(item, env),
    ...(mappedHsn(item, env) ? { gst_hsn_code: mappedHsn(item, env) } : {}),
    stock_uom: mappedUom(item),
    is_stock_item: item.itemType === 'Service' ? 0 : 1,
    disabled: item.active === false || item.status === 'inactive' ? 1 : 0,
    has_batch_no: batchManaged ? 1 : 0,
    ...(item.description ? { description: item.description } : {}),
    ...(Number.isFinite(Number(item.unitPrice)) ? { standard_rate: Number(item.unitPrice) } : {}),
  };
}

export async function syncItem(item, { env = process.env, fetchImpl = fetch } = {}) {
  if (!env.FRAPPE_COMPANY_ID || String(item.companyId) !== String(env.FRAPPE_COMPANY_ID)) {
    return { status: 'not_configured' };
  }
  if (!isFrappeConfigured(env)) {
    return { status: 'not_configured' };
  }

  try {
    const client = createFrappeClient({ env, fetchImpl });
    // Item Code is unique in Frappe, so it is a safe retry key without requiring
    // a site-specific custom field.
    const sameCode = await client.list("Item", { fields: ["name", "item_code"], filters: [["item_code", "=", item.itemCode]], limitPageLength: 2 });
    if (sameCode.length > 1) throw new Error("ERPNext has duplicate Item Codes; manual review is required.");
    const payload = itemPayload(item, env);
    if (sameCode[0]) {
      const updated = await client.update("Item", sameCode[0].name, payload);
      return { status: "synced", name: updated?.name || sameCode[0].name };
    }

    const idField = env.FRAPPE_ITEM_ID_FIELD;
    if (idField) {
      const externalId = `JAYA-${item.companyId}-${item._id}`;
      const existing = await client.findByExternalId("Item", idField, externalId);
      if (existing) {
        const updated = await client.update("Item", existing.name, payload);
        return { status: "synced", name: updated?.name || existing.name };
      }
    }

    const result = await client.create("Item", { ...payload, ...(idField ? { [idField]: `JAYA-${item.companyId}-${item._id}` } : {}) });
    if (!result?.name) throw new Error('ERPNext did not return an Item name.');
    return { status: 'synced', name: result.name };
  } catch (error) {
    return { status: 'failed', message: error?.message || 'ERPNext Item sync failed' };
  }
}
