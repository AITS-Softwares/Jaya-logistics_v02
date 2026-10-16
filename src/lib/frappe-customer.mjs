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
  if (!env.FRAPPE_COMPANY_ID || String(customer.companyId) !== env.FRAPPE_COMPANY_ID) {
    return { status: 'not_configured' };
  }
  if (!env.FRAPPE_URL || !env.FRAPPE_API_KEY || !env.FRAPPE_API_SECRET) {
    return { status: 'not_configured' };
  }
  try {
    const base = new URL(env.FRAPPE_URL);
    if (base.protocol !== 'https:' || base.username || base.password) throw new Error('Invalid configuration');
    const headers = { Authorization: `token ${env.FRAPPE_API_KEY}:${env.FRAPPE_API_SECRET}` };
    const request = async (url, options = {}) => {
      const response = await fetchImpl(url, { ...options, headers: { ...headers, ...options.headers }, redirect: 'error', signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error(`Frappe request failed (${response.status})`);
      return response.json();
    };
    // Configure a unique Data custom field on Frappe Customer for safe retries.
    const name = `JAYA-${customer.companyId}-${customer._id}`;
    const idField = env.FRAPPE_CUSTOMER_ID_FIELD || 'custom_jaya_customer_id';
    const endpoint = new URL('/api/resource/Customer', base);
    const lookup = new URL(endpoint);
    lookup.searchParams.set('filters', JSON.stringify([[idField, '=', name]]));
    lookup.searchParams.set('fields', JSON.stringify(['name']));
    const existing = await request(lookup);
    if (existing.data?.length) return { status: 'synced', name: existing.data[0].name };
    const result = await request(new URL('/api/method/frappe.client.save', base), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: new URLSearchParams({ doc: JSON.stringify({ ...customerPayload(customer, env), [idField]: name, __islocal: 1 }) }),
    });
    if (!result.message?.name) throw new Error('Missing saved customer');
    return { status: 'synced', name: result.message.name };
  } catch (error) {
    return { status: 'failed', message: /^Frappe request failed \(\d+\)$/.test(error.message) ? error.message : 'Frappe connection failed' };
  }
}
