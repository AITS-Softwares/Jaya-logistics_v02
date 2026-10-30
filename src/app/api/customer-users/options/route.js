import Customer from '@/models/CustomerModel';
import { requireCustomerAdmin, customerApiResponse, customerApiFailure } from '@/lib/customerPortalAuth';

export async function GET(req) {
  try {
    const { token, companies } = await requireCustomerAdmin(req);
    const q = String(new URL(req.url).searchParams.get('q') || '').trim().slice(0, 100);
    const filter = { companyId: token.companyId };
    if (q) filter.customerName = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const customers = await Customer.find(filter).select('_id customerName customerCode').sort({ customerName: 1 }).limit(100).lean();
    return customerApiResponse({ customers, companies });
  } catch (error) { return customerApiFailure(error); }
}
