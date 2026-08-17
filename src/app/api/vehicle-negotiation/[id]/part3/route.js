import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import VehicleNegotiation from '@/app/api/vehicle-negotiation/VehicleNegotiation';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';
import { activeOperatingCompanyId, companyScopeFilter } from '@/lib/companyScope';

function authorize(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: 'Authentication required.', status: 401 };
  try {
    const user = verifyJWT(token);
    if (!user) return { error: 'Invalid session.', status: 401 };
    try { activeOperatingCompanyId(user); } catch (error) { return { error: error.message, status: 401 }; }
    if (user.type === 'company' || user.roles?.includes('Admin')) return { user };
    const module = user.modules?.['Vehicle Negotiation'];
    if (!module?.selected || module.permissions?.edit !== true) return { error: 'Vehicle Negotiation edit permission is required.', status: 403 };
    return { user };
  } catch { return { error: 'Invalid session.', status: 401 }; }
}

export async function PATCH(req, { params }) {
  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, message: 'Invalid record id.' }, { status: 400 });
  const auth = authorize(req);
  if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  const body = await req.json();
  await dbConnect();
  const record = await VehicleNegotiation.findOne(companyScopeFilter(auth.user, { _id: id }));
  if (!record) return NextResponse.json({ success: false, message: 'Vehicle Negotiation not found.' }, { status: 404 });
  const rateTargetCompleted = Boolean(record.workflow?.rateTargetCompletedAt) ||
    (Number(record.negotiation?.maxRate) > 0 && Number(record.negotiation?.targetRate) > 0);
  if (!record.workflow?.part1Locked || !rateTargetCompleted) {
    return NextResponse.json({ success: false, message: 'Commercial Part 3 can be entered only after Part 1 is locked and Rate Target is completed.' }, { status: 409 });
  }
  if (record.approval?.part3Status === 'Approved') {
    return NextResponse.json({ success: false, message: 'Commercial Part 3 fields are locked after final VNN approval.' }, { status: 409 });
  }
  const data = body.approval || {};
  for (const key of ['vendorName', 'vendorId', 'vendorCode', 'vendorStatus', 'rateType']) {
    if (data[key] !== undefined) record.approval[key] = data[key];
  }
  if (data.finalPerMT !== undefined) record.approval.finalPerMT = Number(data.finalPerMT) || 0;
  if (data.finalFix !== undefined) record.approval.finalFix = Number(data.finalFix) || 0;
  record.workflow.audit = record.workflow.audit || [];
  record.workflow.audit.push({ action: 'part3-saved', by: auth.user.id || null, at: new Date() });
  await record.save();
  return NextResponse.json({ success: true, data: record });
}
