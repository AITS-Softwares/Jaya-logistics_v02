import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import connectDb from '@/lib/db';
import CustomerUser from '@/models/CustomerUser';
import Customer from '@/models/CustomerModel';
import PortalLoginAttempt from '@/models/PortalLoginAttempt';
import { normalizePortalEmail, validPortalEmail, portalCustomerSession } from '@/lib/customerPortalPolicy.mjs';
import { signCustomerToken, portalError, customerApiFailure, customerApiResponse } from '@/lib/customerPortalAuth';

const invalidCredentials = () => portalError('Invalid login email or password.', 401);
let dummyHash;

export async function POST(req) {
  try {
    const body = await req.json();
    const email = normalizePortalEmail(body.email);
    if (!validPortalEmail(email) || typeof body.password !== 'string' || body.password.length > 256) throw invalidCredentials();
    await connectDb();
    const key = createHash('sha256').update(email).digest('hex');
    const now = new Date();
    // Explicit expiry handling works even before MongoDB's TTL monitor runs.
    await PortalLoginAttempt.deleteOne({ _id: key, expiresAt: { $lte: now } });
    let attempt;
    try {
      attempt = await PortalLoginAttempt.findOneAndUpdate({ _id: key }, {
        $inc: { attempts: 1 }, $setOnInsert: { expiresAt: new Date(now.getTime() + 15 * 60_000) },
      }, { upsert: true, new: true });
    } catch (error) {
      if (error.code !== 11000) throw error;
      attempt = await PortalLoginAttempt.findOneAndUpdate({ _id: key }, { $inc: { attempts: 1 } }, { new: true });
    }
    if (!attempt || attempt.attempts > 10) throw portalError('Too many login attempts. Try again in 15 minutes.', 429);
    const user = await CustomerUser.findOne({ email, isActive: true }).select('+password +sessionVersion');
    dummyHash ||= bcrypt.hash('unavailable-customer-account', 12);
    const matches = await bcrypt.compare(body.password, user?.password || await dummyHash);
    if (!user || !matches) throw invalidCredentials();
    const customer = await Customer.findOne({ _id: user.customerId, companyId: user.companyId, portalAccess: { $ne: false } })
      .select('_id customerName');
    if (!customer) throw invalidCredentials();
    await PortalLoginAttempt.deleteOne({ _id: key });
    await CustomerUser.updateOne({ _id: user._id }, { $set: { lastLoginAt: now } });
    return customerApiResponse({ token: signCustomerToken(user), customer: portalCustomerSession(user, customer) });
  } catch (error) { return customerApiFailure(error); }
}
