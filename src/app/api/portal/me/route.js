import { requireCustomer, customerApiResponse, customerApiFailure } from '@/lib/customerPortalAuth';

export async function GET(req) {
  try {
    const { session, companies } = await requireCustomer(req);
    return customerApiResponse({ user: session, companies: companies.map(company => ({ id: String(company._id), name: company.name, code: company.code })) });
  } catch (error) { return customerApiFailure(error); }
}
