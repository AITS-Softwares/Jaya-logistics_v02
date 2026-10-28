import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import VehicleNegotiation from '@/app/api/vehicle-negotiation/VehicleNegotiation';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';
import { activeOperatingCompanyId, companyScopeFilter } from '@/lib/companyScope';
import { isVnnReadyForDownstream } from '@/lib/vehicleNegotiationWorkflow';
import { notifyModuleCreateUsers } from '@/lib/workflowNotifications';
import { recordApprovedRevision } from '@/lib/reapprovalService';

const MODULE = 'Vehicle Negotiation Placement';

function authorize(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: 'Authentication required.', status: 401 };
  try {
    const user = verifyJWT(token);
    if (!user) return { error: 'Invalid session.', status: 401 };
    activeOperatingCompanyId(user);
    if (user.type === 'company' || user.roles?.includes('Admin')) return { user };
    const module = user.modules?.[MODULE];
    if (!module?.selected || module.permissions?.edit !== true) {
      return { error: `${MODULE} edit permission is required.`, status: 403 };
    }
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
  const data = body.approval || {};
  const required = ['vehicleNo', 'mobile', 'purchaseType', 'paymentTerms'];
  if (required.some((key) => !String(data[key] || '').trim())) {
    return NextResponse.json({ success: false, message: 'Vehicle Number, Mobile, Purchase Type, and Payment Terms are required.' }, { status: 422 });
  }
  if (!/^\d{10}$/.test(String(data.mobile).trim())) {
    return NextResponse.json({ success: false, message: 'Mobile number must contain exactly 10 digits.' }, { status: 422 });
  }

  await dbConnect();
  const record = await VehicleNegotiation.findOne(companyScopeFilter(auth.user, { _id: id }));
  if (!record) return NextResponse.json({ success: false, message: 'Vehicle Negotiation not found.' }, { status: 404 });
  if (record.upstreamPending?.length || record.reapprovalState === 'blockedByUpstream') return NextResponse.json({ success: false, message: 'This Vehicle Negotiation is blocked by an upstream correction.' }, { status: 409 });
  if (record.reapprovalState === 'pendingApproval' || record.reapprovalState === 'syncFailed') return NextResponse.json({ success: false, message: 'This Vehicle Negotiation is waiting for approval or admin sync recovery.' }, { status: 409 });
  const wasReadyForDownstream = isVnnReadyForDownstream(record);
  if (wasReadyForDownstream && !['unlocked', 'pendingApproval', 'pendingReapproval'].includes(record.reapprovalState)) return NextResponse.json({ success: false, message: 'Approved Vehicle Negotiation placement is locked. Ask an admin to unlock it first.' }, { status: 409 });
  if (record.approval?.part3Status !== 'Approved') {
    return NextResponse.json({ success: false, message: 'Vehicle placement becomes available only after Part 3 approval.' }, { status: 409 });
  }
  // const wasReadyForDownstream = isVnnReadyForDownstream(record);

  record.approval.vehicleNo = String(data.vehicleNo).trim();
  record.approval.mobile = String(data.mobile).trim();
  record.approval.purchaseType = String(data.purchaseType).trim();
  record.approval.paymentTerms = String(data.paymentTerms).trim();
  record.workflow = record.workflow || { audit: [] };
  record.workflow.audit = record.workflow.audit || [];
  record.workflow.placementCompletedAt = new Date();
  record.workflow.placementCompletedBy = auth.user.id || null;
  record.workflow.audit.push({ action: 'vehicle-placement-saved', by: auth.user.id || null, at: new Date() });
  if (['unlocked', 'pendingApproval', 'pendingReapproval'].includes(record.reapprovalState)) {
    record.approval.part1Status = 'Pending';
    record.approval.part3Status = 'Pending';
    record.panelStatus = 'Submitted';
    record.reapprovalState = 'pendingApproval';
  }
  await record.save();

  if (!wasReadyForDownstream && isVnnReadyForDownstream(record)) {
    try { await recordApprovedRevision('vnn', record._id, auth.user); }
    catch (syncError) { return NextResponse.json({ success: false, message: `Placement saved, but downstream sync failed and is blocked for admin retry: ${syncError.message}` }, { status: 503 }); }
  }

  if (!wasReadyForDownstream && isVnnReadyForDownstream(record)) {
    await Promise.all([
      notifyModuleCreateUsers({
        user: auth.user, module: 'Pricing Panel', panelLabel: 'Vehicle Negotiation',
        reference: record.vnnNo, url: '/admin/pricing-panel/create',
      }),
      notifyModuleCreateUsers({
        user: auth.user, module: 'Loading Info', panelLabel: 'Vehicle Negotiation',
        reference: record.vnnNo, url: '/admin/Loading-Info/create',
      }),
    ]);
  }

  return NextResponse.json({ success: true, data: { approval: record.approval, workflow: record.workflow } });
}
