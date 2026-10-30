import { createHmac } from 'node:crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import connectDb from '@/lib/db';
import CustomerUser from '@/models/CustomerUser';
import Customer from '@/models/CustomerModel';
import SubCompany from '@/models/SubCompany';
import Company from '@/models/Company';
import CompanyUser from '@/models/CompanyUser';
import { verifyToken } from '@/lib/auth';
import { PORTAL_AUDIENCE, PORTAL_ISSUER, portalCustomerSession } from '@/lib/customerPortalPolicy.mjs';

export function portalError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function portalSecret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured.');
  // Customer tokens cannot verify with the staff signing key, even in legacy raw JWT routes.
  return createHmac('sha256', process.env.JWT_SECRET).update('jaya:customer-portal:v1').digest('hex');
}

export function signCustomerToken(user) {
  return jwt.sign({
    id: String(user._id), companyId: String(user.companyId), customerId: String(user.customerId),
    type: 'customer', sessionVersion: user.sessionVersion || 0,
  }, portalSecret(), { algorithm: 'HS256', audience: PORTAL_AUDIENCE, issuer: PORTAL_ISSUER, expiresIn: '8h' });
}

export async function requireCustomer(req) {
  const bearer = req.headers.get('authorization') || '';
  let token;
  try {
    token = jwt.verify(bearer.startsWith('Bearer ') ? bearer.slice(7) : '', portalSecret(), {
      algorithms: ['HS256'], audience: PORTAL_AUDIENCE, issuer: PORTAL_ISSUER,
    });
  } catch { throw portalError('Your session has expired. Please sign in again.', 401); }
  if (token.type !== 'customer' || !mongoose.isValidObjectId(token.id) || !mongoose.isValidObjectId(token.companyId)) {
    throw portalError('Invalid customer session.', 401);
  }
  await connectDb();
  const user = await CustomerUser.findOne({ _id: token.id, companyId: token.companyId, isActive: true })
    .select('+sessionVersion');
  if (!user || user.sessionVersion !== token.sessionVersion || String(user.customerId) !== token.customerId) {
    throw portalError('Your access has changed. Please sign in again.', 401);
  }
  const customer = await Customer.findOne({ _id: user.customerId, companyId: user.companyId, portalAccess: { $ne: false } })
    .select('_id customerName');
  if (!customer) throw portalError('Customer portal access is unavailable.', 403);
  const companies = await SubCompany.find({
    _id: { $in: user.allowedOperatingCompanyIds }, companyId: user.companyId,
    isActive: true, isOperatingCompany: true,
  }).select('_id name code').lean();
  if (!companies.length) throw portalError('No operating companies are assigned. Contact your administrator.', 403);
  return { user, customer, companies, session: portalCustomerSession(user, customer) };
}

export async function requireCustomerAdmin(req) {
  let token;
  try { token = verifyToken(req); } catch { throw portalError('Please sign in.', 401); }
  await connectDb();
  if (token.type === 'company') {
    const company = await Company.exists({ _id: token.id });
    if (!company || String(token.id) !== String(token.companyId)) throw portalError('Administrator access required.', 403);
  } else if (token.type === 'user') {
    const admin = await CompanyUser.findOne({ _id: token.id, companyId: token.companyId, isActive: true }).lean();
    if (!admin?.roles?.includes('Admin')) throw portalError('Administrator access required.', 403);
    token = { ...token, operatingCompanyIds: admin.operatingCompanyIds, accessAllOperatingCompanies: admin.accessAllOperatingCompanies };
  } else throw portalError('Administrator access required.', 403);
  const filter = { companyId: token.companyId, isActive: true, isOperatingCompany: true };
  if (token.type === 'user' && !token.accessAllOperatingCompanies) filter._id = { $in: token.operatingCompanyIds || [] };
  const companies = await SubCompany.find(filter).select('_id name code').lean();
  return { token, companies };
}

export function customerApiFailure(error) {
  const status = error.code === 11000 ? 409 : error.status || (['ValidationError', 'SyntaxError'].includes(error.name) ? 400 : 500);
  return Response.json({ success: false, message: error.code === 11000 ? 'This customer login email is already in use.' : status === 500 ? 'Unable to complete the request. Please try again.' : error.message }, {
    status, headers: { 'Cache-Control': 'private, no-store' },
  });
}

export function customerApiResponse(data, status = 200) {
  return Response.json({ success: true, ...data }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
