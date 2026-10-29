import { createFrappeClient, isFrappeConfigured } from "@/lib/frappe-client.mjs";

function externalId(customer) {
  return `JAYA-${customer.companyId}-${customer._id}`;
}

// Server-side only. Never expose these credentials through NEXT_PUBLIC variables.
export function customerPayload(customer, env) {
  return {
    doctype: 'Customer',
    customer_name: customer.customerName,
    customer_type: customer.customerType === 'Individual' ? 'Individual' : 'Company',
    gst_category: customer.gstCategory,
    ...(env.FRAPPE_CUSTOMER_GROUP ? { customer_group: env.FRAPPE_CUSTOMER_GROUP } : {}),
    ...(env.FRAPPE_TERRITORY ? { territory: env.FRAPPE_TERRITORY } : {}),
    ...(customer.gstNumber ? { gstin: customer.gstNumber } : {}),
    ...(customer.pan ? { pan: customer.pan } : {}),
  };
}

export async function syncCustomer(customer, { env = process.env, fetchImpl = fetch } = {}) {
  // Scope credentials to one local company to prevent cross-company exports.
  if (!env.FRAPPE_COMPANY_ID || String(customer.companyId) !== String(env.FRAPPE_COMPANY_ID)) {
    return { status: 'not_configured' };
  }
  if (!isFrappeConfigured(env)) {
    return { status: 'not_configured' };
  }
  try {
    const client = createFrappeClient({ env, fetchImpl });
    // Configure a unique Data custom field on Frappe Customer for safe retries.
    const idField = env.FRAPPE_CUSTOMER_ID_FIELD || 'custom_jaya_customer_id';
    const existing = await client.findByExternalId("Customer", idField, externalId(customer));
    const payload = customerPayload(customer, env);
    if (existing) {
      const updated = await client.update("Customer", existing.name, payload);
      return { status: "synced", name: updated?.name || existing.name };
    }
    const result = await client.create("Customer", { ...payload, [idField]: externalId(customer) });
    if (!result?.name) throw new Error('ERPNext did not return a Customer name.');
    return { status: 'synced', name: result.name };
  } catch (error) {
    return { status: 'failed', message: error?.message || 'ERPNext Customer sync failed' };
  }
}
