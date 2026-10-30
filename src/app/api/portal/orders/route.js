import { requireCustomer, customerApiResponse, customerApiFailure } from '@/lib/customerPortalAuth';
import { listCustomerOrders } from '@/lib/customerPortalOrders';

export async function GET(req) {
  try {
    const access = await requireCustomer(req);
    return customerApiResponse(await listCustomerOrders(access, new URL(req.url).searchParams));
  } catch (error) { return customerApiFailure(error); }
}
