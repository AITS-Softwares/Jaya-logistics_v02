import mongoose from 'mongoose';
import { TYPES, resolveDeleteGraph } from './linkGraph';
import { evaluateDeletion, isDeletionAdmin } from './rules';
import { NextResponse } from 'next/server';

const response = (body, status = 200) => ({ body, status });

export async function handleModuleDelete(req, type, user) {
  const url = new URL(req.url);
  const args = { type, id: url.searchParams.get('id'), user };
  const result = url.searchParams.get('dryRun') === 'true'
    ? await previewDeletion(args)
    : await deleteRecord({ ...args, reason: (await req.json().catch(() => ({}))).reason });
  return NextResponse.json(result.body, { status: result.status });
}

export async function previewDeletion({ type, id, user }) {
  if (!isDeletionAdmin(user)) return response({ success: false, message: 'Admin access required' }, 403);
  const entry = TYPES[type];
  if (!entry || !mongoose.isValidObjectId(id)) return response({ success: false, message: 'Invalid record type or ID' }, 400);
  const root = await entry.Model.findOne({ _id: id, companyId: user.companyId }).lean();
  if (!root) return response({ success: false, message: `${entry.label} not found` }, 404);
  const graph = await resolveDeleteGraph(type, root, user.companyId, null);
  if (!graph.some((item) => item.type === type && item.id === String(root._id))) {
    return response({ success: false, message: `Could not resolve ${entry.label} ${root[entry.no] || id}. Please refresh and try again.` }, 500);
  }
  return response({ success: true, ...(await evaluateDeletion(graph, user.companyId, null)) });
}

export async function deleteRecord({ type, id, user, reason }) {
  if (!isDeletionAdmin(user)) return response({ success: false, message: 'Admin access required' }, 403);
  const entry = TYPES[type];
  if (!entry || !mongoose.isValidObjectId(id)) return response({ success: false, message: 'Invalid record type or ID' }, 400);
  if (!String(reason || '').trim()) return response({ success: false, message: 'A deletion reason is required' }, 400);

  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const root = await entry.Model.findOne({ _id: id, companyId: user.companyId }).session(session).lean();
      if (!root) throw Object.assign(new Error(`${entry.label} not found`), { status: 404 });
      const graph = await resolveDeleteGraph(type, root, user.companyId, session);
      if (!graph.some((item) => item.type === type && item.id === String(root._id))) {
        throw Object.assign(new Error(`Could not resolve ${entry.label} ${root[entry.no] || id}. Refresh and try again.`), { status: 500 });
      }
      const impact = await evaluateDeletion(graph, user.companyId, session);
      if (!impact.canConfirm) throw Object.assign(new Error(impact.blockers.join('; ')), { status: 409, blockers: impact.blockers, impact: impact.impact });

      const batchId = new mongoose.Types.ObjectId().toString();
      const rootNo = String(root[entry.no] || root.lrNo || root.podNo || root._id);
      for (const item of graph) {
        const Model = TYPES[item.type].Model;
        const changes = {
          isDeleted: true, deletedAt: new Date(), deletedBy: mongoose.isValidObjectId(user.id) ? user.id : null,
          deleteReason: String(reason).trim(), deleteBatchId: batchId,
          deleteRootType: type, deleteRootNo: rootNo,
          statusBeforeDelete: item.record.panelStatus || item.record.status || item.record.header?.status || null,
        };
        if (item.type === 'lr' && item.record.orderRowId) {
          changes.deletedOrderRowId = item.record.orderRowId;
          changes.orderRowId = '';
        }
        const update = await Model.updateOne({ _id: item.id, companyId: user.companyId, isDeleted: { $ne: true } }, { $set: changes }, { session, runValidators: false });
        if (update.matchedCount !== 1) throw new Error(`${item.label} ${item.no} changed while deletion was being confirmed. Refresh and try again.`);
      }
      result = { success: true, batchId, deleted: graph.map(({ type: t, no, label }) => ({ type: t, no, label })) };
    });
  } catch (error) {
    result = { success: false, message: error.message, ...(error.blockers ? { blockers: error.blockers, impact: error.impact } : {}) };
    return response(result, error.status || 500);
  } finally {
    await session.endSession();
  }
  return response(result);
}

async function deletedParent(type, doc, companyId, session) {
  const find = (kind, filter) => TYPES[kind].Model.findOne({ companyId, isDeleted: true, ...filter }).setOptions({ includeDeleted: true }).session(session).lean();
  let parent = null;
  if (type === 'purchase' && doc.vnnNo) parent = await find('vnn', { vnnNo: doc.vnnNo });
  else if (type === 'advance' && doc.purchaseNo) parent = await find('purchase', { purchaseNo: doc.purchaseNo });
  else if (type === 'pricing' && doc.vnnNo) parent = await find('vnn', { vnnNo: doc.vnnNo });
  else if (type === 'loading' && doc.vehicleNegotiationNo) parent = await find('vnn', { vnnNo: doc.vehicleNegotiationNo });
  else if (type === 'lr' && doc.loadingInfoNo) parent = await find('loading', { vehicleArrivalNo: doc.loadingInfoNo });
  else if (type === 'pod') {
    const lrNo = doc.lrEntries?.[0]?.lrNo;
    if (lrNo) parent = await find('lr', { lrNo });
  } else if (type === 'balance') {
    if (doc.podNo) parent = await find('pod', { podNo: doc.podNo });
    if (!parent && doc.lrNo) parent = await find('lr', { lrNo: doc.lrNo });
  }
  if (!parent && ['purchase', 'vnn', 'loading', 'lr'].includes(type)) {
    const orderNo = doc.orderNo || doc.header?.orderNo || doc.orders?.[0]?.orderNo || doc.orderRows?.[0]?.orderNo;
    if (orderNo) parent = await find('order', { orderPanelNo: orderNo });
  }
  return parent;
}

export async function restoreRecord({ type, id, user }) {
  if (!isDeletionAdmin(user)) return response({ success: false, message: 'Admin access required' }, 403);
  const entry = TYPES[type];
  if (!entry || !mongoose.isValidObjectId(id)) return response({ success: false, message: 'Invalid record type or ID' }, 400);
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const root = await entry.Model.findOne({ _id: id, companyId: user.companyId, isDeleted: true }).setOptions({ includeDeleted: true }).session(session).lean();
      if (!root) throw Object.assign(new Error(`${entry.label} not found or is not deleted`), { status: 404 });
      const parent = await deletedParent(type, root, user.companyId, session);
      if (parent) throw Object.assign(new Error(`Restore ${parent.orderPanelNo || parent.purchaseNo || parent.vnnNo || parent.vehicleArrivalNo || parent.lrNo || parent.podNo} first`), { status: 409 });
      if (root.deleteRootType !== type || String(root.deleteRootNo) !== String(root[entry.no] || root.lrNo || root.podNo || root._id)) {
        throw Object.assign(new Error(`Restore ${root.deleteRootNo || 'the deleted parent'} first`), { status: 409 });
      }
      const batch = root.deleteBatchId;
      const batchDocs = await Promise.all(Object.entries(TYPES).map(async ([key, { Model }]) => ({ key, docs: await Model.find({ companyId: user.companyId, isDeleted: true, deleteBatchId: batch }).setOptions({ includeDeleted: true }).session(session).lean() })));
      const currentGraph = await resolveDeleteGraph(type, root, user.companyId, session);
      const blockers = (await evaluateDeletion(currentGraph, user.companyId, session)).blockers;
      if (blockers.length) throw Object.assign(new Error(blockers.join('; ')), { status: 409 });
      for (const { key, docs } of batchDocs) for (const doc of docs) {
        if (key === 'lr' && doc.deletedOrderRowId) {
          const duplicate = await TYPES.lr.Model.findOne({ _id: { $ne: doc._id }, companyId: user.companyId, orderRowId: doc.deletedOrderRowId, isDeleted: { $ne: true } }).session(session).lean();
          if (duplicate) throw Object.assign(new Error(`Cannot restore LR ${doc.lrNo}: order row is already assigned to another LR`), { status: 409 });
        }
        const restore = { isDeleted: false, deletedAt: null, deletedBy: null, deleteReason: '', deleteBatchId: null, deleteRootType: null, deleteRootNo: null, statusBeforeDelete: null };
        if (key === 'lr' && doc.deletedOrderRowId) { restore.orderRowId = doc.deletedOrderRowId; restore.deletedOrderRowId = ''; }
        await TYPES[key].Model.updateOne({ _id: doc._id, companyId: user.companyId, isDeleted: true }, { $set: restore }, { session, runValidators: false, includeDeleted: true });
      }
      result = { success: true, restored: batchDocs.reduce((n, item) => n + item.docs.length, 0) };
    });
  } catch (error) {
    return response({ success: false, message: error.message }, error.status || 500);
  } finally {
    await session.endSession();
  }
  return response(result);
}
