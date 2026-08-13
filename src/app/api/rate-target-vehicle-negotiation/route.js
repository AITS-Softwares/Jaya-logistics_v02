import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import VehicleNegotiation from '@/app/api/vehicle-negotiation/VehicleNegotiation';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';
import { activeOperatingCompanyId, companyScopeFilter } from '@/lib/companyScope';

const MODULE = 'Rate Target (Vehicle Negotiation)';

function authorize(req, action = 'view') {
  const token = getTokenFromHeader(req);
  if (!token) return { error: 'Authentication required.', status: 401 };

  try {
    const user = verifyJWT(token);
    if (!user) return { error: 'Invalid session.', status: 401 };
    try { activeOperatingCompanyId(user); } catch (error) { return { error: error.message, status: 401 }; }
    if (user.type === 'company' || user.roles?.includes('Admin')) return { user };
    const module = user.modules?.[MODULE];
    if (!module?.selected || module.permissions?.[action] !== true) {
      return { error: `You do not have ${action} access to Rate Target.`, status: 403 };
    }
    return { user };
  } catch {
    return { error: 'Invalid session.', status: 401 };
  }
}

export async function GET(req) {
  const auth = authorize(req);
  if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const query = { 'workflow.part1Locked': true };
  if (status && ['Pending', 'Approved', 'Reject'].includes(status)) query['approval.part2Status'] = status;

  const records = await VehicleNegotiation.find(companyScopeFilter(auth.user, query))
    .select('vnnNo date branchName partyName totalWeight negotiation approval.part2Status workflow.part1LockedAt updatedAt')
    .sort({ updatedAt: -1 })
    .lean();

  return NextResponse.json({ success: true, data: records });
}
