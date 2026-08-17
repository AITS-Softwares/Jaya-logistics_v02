import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
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

function recordQuery(id, user) {
  return companyScopeFilter(user, { _id: id });
}

function addAudit(record, action, user) {
  record.workflow.audit.push({ action, by: user.id || null, at: new Date() });
}

export async function GET(req, { params }) {
  const auth = authorize(req);
  if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, message: 'Invalid record id.' }, { status: 400 });

  await dbConnect();
  const record = await VehicleNegotiation.findOne(recordQuery(id, auth.user)).lean();
  if (!record) return NextResponse.json({ success: false, message: 'Vehicle Negotiation not found.' }, { status: 404 });
  if (!record.workflow?.part1Locked) return NextResponse.json({ success: false, message: 'Part 1 must be locked before Rate Target can be accessed.' }, { status: 409 });
  return NextResponse.json({ success: true, data: record });
}

export async function PUT(req, { params }) {
  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, message: 'Invalid record id.' }, { status: 400 });
  const body = await req.json();
  const auth = authorize(req, 'edit');
  if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });

  await dbConnect();
  const record = await VehicleNegotiation.findOne(recordQuery(id, auth.user));
  if (!record) return NextResponse.json({ success: false, message: 'Vehicle Negotiation not found.' }, { status: 404 });
  if (!record.workflow?.part1Locked) return NextResponse.json({ success: false, message: 'Part 1 must be locked first.' }, { status: 409 });

  if (record.approval?.part3Status === 'Approved') {
    return NextResponse.json({ success: false, message: 'Rate Target cannot be changed after final VNN approval.' }, { status: 409 });
  }
  const input = body.negotiation || {};
  const maxRate = Number(input.maxRate);
  const targetRate = Number(input.targetRate);
  if (!Number.isFinite(maxRate) || maxRate <= 0 || !Number.isFinite(targetRate) || targetRate <= 0) {
    return NextResponse.json({ success: false, message: 'Max Rate and Target Rate are required and must be greater than zero.' }, { status: 422 });
  }
  record.negotiation.maxRate = maxRate;
  record.negotiation.targetRate = targetRate;
  record.negotiation.oldRatePercent = input.oldRatePercent || '';
  record.negotiation.remarks1 = input.remarks1 || '';
  if (body.voiceNote !== undefined) record.voiceNote = body.voiceNote || '';
  if (body.voiceNoteFile !== undefined) record.voiceNoteFile = body.voiceNoteFile || null;
  // Rate Target is data entry, not an approval. Its completion is tracked in
  // workflow metadata so Part 3 can be safely unlocked without Part 2 status.
  record.workflow = record.workflow || { audit: [] };
  record.workflow.rateTargetCompletedAt = record.workflow.rateTargetCompletedAt || new Date();
  record.workflow.rateTargetCompletedBy = record.workflow.rateTargetCompletedBy || (auth.user.id || null);
  record.workflow.rateTargetLastSavedAt = new Date();
  addAudit(record, 'rate-target-saved', auth.user);

  await record.save();
  return NextResponse.json({ success: true, data: record });
}
