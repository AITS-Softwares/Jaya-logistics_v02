import { currentBranchAccess, withBranchAccess } from '@/lib/branchAccess';
import { NextResponse } from 'next/server';
import connectDb from '@/lib/db';
import { hasPermission, verifyToken } from '@/lib/auth';
import { TYPES } from '@/lib/deletion/linkGraph';
import { deleteRecord, previewDeletion, restoreRecord } from '@/lib/deletion/handler';
import { isDeletionAdmin } from '@/lib/deletion/rules';

function send(result) {
  return NextResponse.json(result.body, { status: result.status });
}

function userFromRequest(req) {
  try { return verifyToken(req); } catch (error) { return { error: error.message }; }
}

async function branchHandlerDELETE(req) {
  await connectDb();
  const user = userFromRequest(req);
  if (user.error) return NextResponse.json({ success: false, message: user.error }, { status: 401 });
  const url = new URL(req.url);
  const args = { type: url.searchParams.get('type'), id: url.searchParams.get('id'), user };
  if (url.searchParams.get('dryRun') === 'true') return send(await previewDeletion(args));
  const body = await req.json().catch(() => ({}));
  return send(await deleteRecord({ ...args, reason: body.reason }));
}

async function branchHandlerPOST(req) {
  await connectDb();
  const user = userFromRequest(req);
  if (user.error) return NextResponse.json({ success: false, message: user.error }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  return send(await restoreRecord({ type: body.type, id: body.id, user }));
}

async function branchHandlerGET(req) {
  await connectDb();
  const user = userFromRequest(req);
  if (user.error) return NextResponse.json({ success: false, message: user.error }, { status: 401 });
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');
  if (url.searchParams.get('dryRun') === 'true') {
    return send(await previewDeletion({ type, id, user }));
  }
  if (url.searchParams.get('includeDeleted') !== 'true') return NextResponse.json({ success: false, message: 'includeDeleted=true is required' }, { status: 400 });
  const entry = TYPES[type];
  if (!entry) return NextResponse.json({ success: false, message: 'Invalid record type' }, { status: 400 });
  const modules = { order: 'Order Panel', purchase: 'Purchase Panel', advance: 'Advance Payment', vnn: 'Vehicle Negotiation', pricing: 'Pricing Panel', loading: 'Loading Info', lr: 'Consignment Note', pod: 'Proof Of Delivery', balance: 'Balance-Payment' };
  if (!hasPermission(user, modules[type], 'view')) return NextResponse.json({ success: false, message: 'View permission required' }, { status: 403 });
  const access = await currentBranchAccess(user);
  const filter = { companyId: entry.Model.db.base.Types.ObjectId.createFromHexString(String(user.companyId)), isDeleted: true };
  if (user.activeOperatingCompanyId) {
    filter.subCompanyId = entry.Model.db.base.Types.ObjectId.createFromHexString(String(user.activeOperatingCompanyId));
  } else if (!(user.type === 'company' && user.isGroupAdmin)) {
    return NextResponse.json({ success: false, message: 'Select an operating company first.' }, { status: 403 });
  }
  if (!access.accessAllBranches) filter.owningBranchIds = { $in: access.branchIds };
  // Read metadata only. Deleted records must never enter transaction lookups or actions.
  const projection = { _id: 1, [entry.no]: 1, deletedAt: 1, deleteReason: 1, deleteRootType: 1, deleteRootNo: 1 };
  const data = await entry.Model.collection.find(filter, { projection }).sort({ deletedAt: -1 }).limit(500).toArray();
  return NextResponse.json({ success: true, data, canRestore: isDeletionAdmin(user) }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export const DELETE = withBranchAccess(branchHandlerDELETE);
export const POST = withBranchAccess(branchHandlerPOST);
export const GET = withBranchAccess(branchHandlerGET);
