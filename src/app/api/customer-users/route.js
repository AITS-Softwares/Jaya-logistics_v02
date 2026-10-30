import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import CustomerUser from '@/models/CustomerUser';
import Customer from '@/models/CustomerModel';
import { normalizePortalEmail, validPortalEmail, validPortalPassword } from '@/lib/customerPortalPolicy.mjs';
import { requireCustomerAdmin, portalError, customerApiResponse, customerApiFailure } from '@/lib/customerPortalAuth';

async function assignment(body, admin) {
  const name = String(body.name || '').trim();
  const email = normalizePortalEmail(body.email);
  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') throw portalError('Invalid account status.');
  if (!name || name.length > 120 || !validPortalEmail(email)) throw portalError('Enter a name and valid login email.');
  if (!mongoose.isValidObjectId(body.customerId) || !await Customer.exists({ _id: body.customerId, companyId: admin.token.companyId })) {
    throw portalError('Select a customer from your company.');
  }
  const companyIds = Array.isArray(body.allowedOperatingCompanyIds) ? [...new Set(body.allowedOperatingCompanyIds.map(String))] : [];
  if (!companyIds.length || companyIds.some(id => !admin.companies.some(company => String(company._id) === id))) {
    throw portalError('Select at least one operating company you are allowed to assign.');
  }
  return { name, email, customerId: body.customerId, allowedOperatingCompanyIds: companyIds, isActive: body.isActive !== false };
}

export async function GET(req) {
  try {
    const { token } = await requireCustomerAdmin(req);
    const params = new URL(req.url).searchParams;
    const page = Math.max(1, Math.min(100000, Math.floor(Number(params.get('page')) || 1)));
    const q = String(params.get('q') || '').trim().slice(0, 100);
    const filter = { companyId: token.companyId };
    if (q) {
      const regex = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      filter.$or = [{ name: regex }, { email: regex }];
    }
    const total = await CustomerUser.countDocuments(filter);
    const users = await CustomerUser.find(filter).select('name email customerId allowedOperatingCompanyIds isActive lastLoginAt createdAt')
      .populate('customerId', 'customerName customerCode').sort({ createdAt: -1 }).skip((page - 1) * 25).limit(25).lean();
    return customerApiResponse({ users, total, page, pageCount: Math.max(1, Math.ceil(total / 25)) });
  } catch (error) { return customerApiFailure(error); }
}

export async function POST(req) {
  try {
    const admin = await requireCustomerAdmin(req);
    const body = await req.json();
    const values = await assignment(body, admin);
    if (!validPortalPassword(body.password)) throw portalError('Password must be at least 8 characters and at most 72 UTF-8 bytes.');
    const user = await CustomerUser.create({ ...values, companyId: admin.token.companyId, password: await bcrypt.hash(body.password, 12), createdBy: admin.token.id });
    return customerApiResponse({ id: String(user._id), message: 'Customer login created.' }, 201);
  } catch (error) { return customerApiFailure(error); }
}

export async function PUT(req) {
  try {
    const admin = await requireCustomerAdmin(req);
    const body = await req.json();
    if (!mongoose.isValidObjectId(body.id)) throw portalError('Invalid customer user.');
    const values = await assignment(body, admin);
    if (body.password) {
      if (!validPortalPassword(body.password)) throw portalError('Password must be at least 8 characters and at most 72 UTF-8 bytes.');
      values.password = await bcrypt.hash(body.password, 12);
    }
    const user = await CustomerUser.findOneAndUpdate({ _id: body.id, companyId: admin.token.companyId }, {
      $set: values, $inc: { sessionVersion: 1 },
    }, { new: true, runValidators: true });
    if (!user) throw portalError('Customer user not found.', 404);
    return customerApiResponse({ message: 'Customer login updated. Previous sessions have been revoked.' });
  } catch (error) { return customerApiFailure(error); }
}
