import {vnnPurchaseType} from '@/lib/vnnPart3.mjs';
import { withBranchAccess } from '@/lib/branchAccess';
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

async function branchHandlerPATCH(req, { params }) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, message: 'Invalid record id.' }, { status: 400 });
  const auth = authorize(req);
  if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  const body = await req.json();
  await dbConnect();
  const record = await VehicleNegotiation.findOne(companyScopeFilter(auth.user, { _id: id }));
  if (!record) return NextResponse.json({ success: false, message: 'Vehicle Negotiation not found.' }, { status: 404 });
  if (record.upstreamPending?.length || record.reapprovalState === 'blockedByUpstream') return NextResponse.json({ success: false, message: 'This Vehicle Negotiation is blocked by an upstream correction.' }, { status: 409 });
  if (record.reapprovalState === 'pendingApproval' || record.reapprovalState === 'syncFailed') return NextResponse.json({ success: false, message: 'This Vehicle Negotiation is waiting for approval or admin sync recovery.' }, { status: 409 });
  if (record.workflow?.part1Locked) return NextResponse.json({ success: false, message: 'Parts 1 and 3 are locked together. Use Amend to reopen both parts.' }, { status: 409 });
  const isReapprovalEdit = ['unlocked', 'pendingApproval', 'pendingReapproval'].includes(record.reapprovalState);
  if (record.approval?.part3Status === 'Approved' && !isReapprovalEdit) {
    return NextResponse.json({ success: false, message: 'Commercial Part 3 fields are locked after final VNN approval.' }, { status: 409 });
  }
  const data = body.approval || {};
  for (const key of ['vendorName', 'vendorId', 'vendorCode', 'vendorStatus', 'rateType', 'paymentTerms', 'commercialRemarks']) {
    if (data[key] !== undefined) record.approval[key] = data[key];
  }
  if (data.finalPerMT !== undefined) record.approval.finalPerMT = Number(data.finalPerMT) || 0;
  if (data.finalFix !== undefined) record.approval.finalFix = Number(data.finalFix) || 0;
  if (data.advance !== undefined) record.approval.advance = Number(data.advance) || 0;
  record.approval.purchaseType=vnnPurchaseType(record.vendors,record.approval);
  record.workflow.audit = record.workflow.audit || [];
  record.workflow.audit.push({ action: 'part3-saved', by: auth.user.id || null, at: new Date() });
  if (isReapprovalEdit) {
    record.approval.part1Status = 'Pending';
    record.approval.part3Status = 'Pending';
    record.panelStatus = 'Draft';
    record.reapprovalState = 'unlocked';
  }
  await record.save();
  return NextResponse.json({ success: true, data: record });
}

export const PATCH = withBranchAccess(branchHandlerPATCH);
