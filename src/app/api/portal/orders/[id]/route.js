import { requireCustomer, customerApiResponse, customerApiFailure } from '@/lib/customerPortalAuth';
import { findCustomerOrder, customerOrderViews } from '@/lib/customerPortalOrders';

export async function GET(req, context) {
  try {
    const access = await requireCustomer(req);
    const { id } = await context.params;
    const order = await findCustomerOrder(access, id);
    const [view] = await customerOrderViews(access, [order]);
    return customerApiResponse({ order: view });
  } catch (error) { return customerApiFailure(error); }
}
