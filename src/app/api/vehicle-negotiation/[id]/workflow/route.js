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
    activeOperatingCompanyId(user);
    if (user.type === 'company' || user.roles?.includes('Admin')) return { user };
    const module = user.modules?.['Vehicle Negotiation'];
    if (!module?.selected || module.permissions?.edit !== true) return { error: 'Vehicle Negotiation edit permission is required.', status: 403 };
    return { user };
  } catch {
    return { error: 'Invalid session.', status: 401 };
  }
}

export async function PATCH(req, { params }) {
  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, message: 'Invalid record id.' }, { status: 400 });
  const auth = authorize(req);
  if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  const body = await req.json();
  if (!['lock-part1', 'amend-part1'].includes(body.action)) return NextResponse.json({ success: false, message: 'Unsupported workflow action.' }, { status: 400 });

  await dbConnect();
  const record = await VehicleNegotiation.findOne(companyScopeFilter(auth.user, { _id: id }));
  if (!record) return NextResponse.json({ success: false, message: 'Vehicle Negotiation not found.' }, { status: 404 });
  record.workflow = record.workflow || { audit: [] };
  record.workflow.audit = record.workflow.audit || [];

  if (body.action === 'lock-part1') {
    if (record.workflow.part1Locked) return NextResponse.json({ success: false, message: 'Part 1 is already locked.' }, { status: 409 });
    record.workflow.part1Locked = true;
    record.workflow.part1LockedAt = new Date();
    record.workflow.part1LockedBy = auth.user.id || null;
    record.workflow.audit.push({ action: 'part1-locked', by: auth.user.id || null, at: new Date() });
  } else {
    if (!record.workflow.part1Locked) return NextResponse.json({ success: false, message: 'Only a locked Part 1 can be amended.' }, { status: 409 });
    if (record.pricingPanelId) return NextResponse.json({ success: false, message: 'This record is already used by Pricing Panel and cannot be amended.' }, { status: 409 });
    const reason = String(body.reason || '').trim();
    if (!reason) return NextResponse.json({ success: false, message: 'An amendment reason is required.' }, { status: 422 });
    record.workflow.part1Locked = false;
    record.workflow.part1LockedAt = null;
    record.workflow.part1LockedBy = null;
    record.workflow.amendmentCount = (record.workflow.amendmentCount || 0) + 1;
    record.workflow.lastAmendmentReason = reason;
    record.workflow.lastAmendedAt = new Date();
    record.workflow.lastAmendedBy = auth.user.id || null;
    record.workflow.audit.push({ action: 'part1-amended', reason, by: auth.user.id || null, at: new Date() });
    record.negotiation.maxRate = 0;
    record.negotiation.targetRate = 0;
    record.negotiation.oldRatePercent = '';
    record.negotiation.remarks1 = '';
    record.voiceNote = '';
    record.voiceNoteFile = null;
    record.workflow.rateTargetCompletedAt = null;
    record.workflow.rateTargetCompletedBy = null;
    record.workflow.rateTargetLastSavedAt = null;
    record.workflow.placementCompletedAt = null;
    record.workflow.placementCompletedBy = null;
    record.approval.part3Status = 'Pending';
    record.approval.part3Remarks = '';
    record.approval.vehicleNo = '';
    record.approval.mobile = '';
    record.approval.purchaseType = '';
    record.approval.paymentTerms = '';
  }

  await record.save();
  return NextResponse.json({ success: true, data: { workflow: record.workflow, approval: record.approval } });
}
