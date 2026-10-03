import { NextResponse } from 'next/server';
import connectDb from '@/lib/db';
import DetentionRule from './DetentionRule';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';
import { activeOperatingCompanyId, companyScopeFilter } from '@/lib/companyScope';

async function userFor(req) {
  const token = getTokenFromHeader(req);
  if (!token) throw new Error('Authentication required');
  const user = verifyJWT(token);
  if (!user) throw new Error('Authentication required');
  activeOperatingCompanyId(user);
  return user;
}

function isAdministrator(user) {
  return user?.type === 'company' || user?.roles?.includes('Admin');
}

export async function GET(req) {
  try {
    await connectDb(); const user = await userFor(req);
    const rules = await DetentionRule.find(companyScopeFilter(user, {})).sort({ priority: 1, createdAt: 1 }).lean();
    return NextResponse.json({ success: true, data: rules });
  } catch (error) { return NextResponse.json({ success: false, message: error.message }, { status: 401 }); }
}

export async function POST(req) {
  try {
    await connectDb(); const user = await userFor(req); const body = await req.json();
    if (!body.name || !body.movementType || !body.ruleType) return NextResponse.json({ success: false, message: 'Name, movement type and rule type are required.' }, { status: 400 });
    const rule = await DetentionRule.create({
      name: body.name, active: body.active !== false, movementType: body.movementType, ruleType: body.ruleType,
      cutoffTime: body.cutoffTime || '16:00', graceDays: Number.isFinite(Number(body.graceDays)) ? Number(body.graceDays) : (body.ruleType === 'OUTSTATION_NEXT_CALENDAR_DAY' ? 2 : 1), additionalDayMethod: body.additionalDayMethod || 'PARTIAL_24_HOURS',
      ratePerDay: Number(body.ratePerDay) || 0, effectiveFrom: body.effectiveFrom || new Date(), priority: Number(body.priority) || 100,
      // companyId identifies the tenant; subCompanyId identifies the active
      // operating company.  This matches companyScopeFilter used for reads.
      companyId: user.companyId, subCompanyId: activeOperatingCompanyId(user), createdBy: user.id || user._id
    });
    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error) { return NextResponse.json({ success: false, message: error.message }, { status: 400 }); }
}

export async function PUT(req) {
  try {
    await connectDb(); const user = await userFor(req); const body = await req.json();
    const update = {
      name: body.name, active: body.active, movementType: body.movementType, ruleType: body.ruleType,
      cutoffTime: body.cutoffTime, graceDays: body.graceDays, additionalDayMethod: body.additionalDayMethod,
      ratePerDay: body.ratePerDay, effectiveFrom: body.effectiveFrom, priority: body.priority
    };
    const rule = await DetentionRule.findOneAndUpdate(companyScopeFilter(user, { _id: body._id }), update, { new: true, runValidators: true });
    if (!rule) return NextResponse.json({ success: false, message: 'Rule not found.' }, { status: 404 });
    return NextResponse.json({ success: true, data: rule });
  } catch (error) { return NextResponse.json({ success: false, message: error.message }, { status: 400 }); }
}

export async function DELETE(req) {
  try {
    await connectDb(); const user = await userFor(req);
    if (!isAdministrator(user)) {
      return NextResponse.json({ success: false, message: 'Only administrators can delete detention rules.' }, { status: 403 });
    }
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: 'Rule id is required.' }, { status: 400 });
    const rule = await DetentionRule.findOneAndDelete(companyScopeFilter(user, { _id: id }));
    if (!rule) return NextResponse.json({ success: false, message: 'Rule not found.' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Rule deleted successfully.' });
  } catch (error) { return NextResponse.json({ success: false, message: error.message }, { status: 400 }); }
}
