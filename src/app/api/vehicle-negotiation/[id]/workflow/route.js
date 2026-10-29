import { withBranchAccess } from '@/lib/branchAccess';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import VehicleNegotiation from '@/app/api/vehicle-negotiation/VehicleNegotiation';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';
import { activeOperatingCompanyId, companyScopeFilter } from '@/lib/companyScope';
import { isVnnReadyForDownstream } from '@/lib/vehicleNegotiationWorkflow';
import { replaceCancelledVnnOrders } from '@/lib/replaceCancelledVnnOrders';
import { notifyModuleApprovers } from '@/lib/workflowNotifications';

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

async function branchHandlerPATCH(req, { params }) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, message: 'Invalid record id.' }, { status: 400 });
  const auth = authorize(req);
  if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  const body = await req.json();
  if (body.action === 'replace-cancelled-orders') {
    await dbConnect();
    try {
      const data = await replaceCancelledVnnOrders(auth.user, id, body);
      return NextResponse.json({ success: true, message: 'Cancelled orders replaced and VNN submitted for approval.', data });
    } catch (error) {
      return NextResponse.json({ success: false, message: error.message || 'Could not replace cancelled orders.' }, { status: error.status || 500 });
    }
  }
  if (!['lock-part1', 'amend-part1'].includes(body.action)) return NextResponse.json({ success: false, message: 'Unsupported workflow action.' }, { status: 400 });

  await dbConnect();
  const record = await VehicleNegotiation.findOne(companyScopeFilter(auth.user, { _id: id }));
  if (!record) return NextResponse.json({ success: false, message: 'Vehicle Negotiation not found.' }, { status: 404 });
  if (record.workflow?.cancelledOrderReplacementOnly) return NextResponse.json({ success: false, message: 'This amendment is limited to cancelled order replacement. Use Replace cancelled orders to resubmit it; general Parts 1 and 3 amendments still require an admin correction.' }, { status: 409 });
  if (record.upstreamPending?.length || record.reapprovalState === 'blockedByUpstream') return NextResponse.json({ success: false, message: 'This Vehicle Negotiation is blocked by an upstream correction.' }, { status: 409 });
  if (record.reapprovalState === 'syncFailed') return NextResponse.json({ success: false, message: 'This Vehicle Negotiation is waiting for approval or admin sync recovery.' }, { status: 409 });
  if (body.action === 'amend-part1' && record.approval?.part3Status === 'Approved' && !['unlocked', 'pendingReapproval'].includes(record.reapprovalState)) return NextResponse.json({ success: false, message: 'An admin must unlock this approved record before Parts 1 and 3 can be amended.' }, { status: 409 });
  if (body.action === 'lock-part1' && isVnnReadyForDownstream(record) && record.reapprovalState !== 'unlocked') return NextResponse.json({ success: false, message: 'Approved Vehicle Negotiations are locked. Ask an admin to unlock this record first.' }, { status: 409 });
  record.workflow = record.workflow || { audit: [] };
  record.workflow.audit = record.workflow.audit || [];

  if (body.action === 'lock-part1') {
    if (record.workflow.part1Locked) return NextResponse.json({ success: false, message: 'Part 1 is already locked.' }, { status: 409 });
    record.workflow.part1Locked = true;
    record.workflow.part1LockedAt = new Date();
    record.workflow.part1LockedBy = auth.user.id || null;
    record.panelStatus = 'Submitted';
    record.approval.part1Status = 'Pending';
    record.approval.part3Status = 'Pending';
    if (['unlocked', 'pendingReapproval'].includes(record.reapprovalState)) record.reapprovalState = 'pendingApproval';
    record.workflow.audit.push({ action: 'part1-locked', by: auth.user.id || null, at: new Date() });
  } else {
    if (!record.workflow.part1Locked) return NextResponse.json({ success: false, message: 'Only a locked Part 1 can be amended.' }, { status: 409 });
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
    record.approval.part1Status = 'Pending';
    record.approval.part1Remarks = '';
    record.approval.part3Status = 'Pending';
    record.approval.part3Remarks = '';
    record.panelStatus = 'Draft';
    record.reapprovalState = 'unlocked';
    record.workflow.audit.push({ action: 'reapproval-required', reason, by: auth.user.id || null, at: new Date() });
  }

  await record.save();
  if (body.action === 'lock-part1') await notifyModuleApprovers({ user: auth.user, module: 'Vehicle Negotiation', panelLabel: 'Vehicle Negotiation', reference: record.vnnNo, url: `/admin/vehicle-negotiation/approve/${record._id}` });
  return NextResponse.json({ success: true, data: { workflow: record.workflow, approval: record.approval } });
}

export const PATCH = withBranchAccess(branchHandlerPATCH);
