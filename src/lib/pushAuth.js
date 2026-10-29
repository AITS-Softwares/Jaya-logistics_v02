import { verifyToken } from '@/lib/auth';
import connectDb from '@/lib/db';
import CompanyUser from '@/models/CompanyUser';
import Company from '@/models/Company';

export async function pushIdentity(req) {
  let user;
  try { user = verifyToken(req); } catch { throw Object.assign(new Error('Sign in to manage notifications.'), { status: 401 }); }
  if (!['user', 'company'].includes(user.type)) throw Object.assign(new Error('Staff account required.'), { status: 403 });
  await connectDb();
  if (user.type === 'user') {
    const saved = await CompanyUser.findOne({ _id: user.id, companyId: user.companyId, isActive: { $ne: false } }).lean();
    if (!saved) throw Object.assign(new Error('This account is no longer active.'), { status: 403 });
    user = { ...user, ...saved, id: String(saved._id), type: 'user' };
  } else if (!await Company.exists({ _id: user.id })) {
    throw Object.assign(new Error('This company account is unavailable.'), { status: 403 });
  }
  return user;
}

export function pushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}
