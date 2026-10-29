import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import connectDb from '@/lib/db';
import CompanyUser from '@/models/CompanyUser';
import Branch from '@/app/api/branches/schema';
import { branchContext, branchDenied } from './branchContext';
import { branchModels, key, makeOwnershipResolver, canAccessBranches } from './branchOwnership.mjs';

export async function currentBranchAccess(user) {
  if (user?.type !== 'user') return { accessAllBranches: true, branchIds: [] };
  await connectDb();
  const saved = await CompanyUser.findOne({ _id: user.id, companyId: user.companyId })
    .select('accessAllBranches branchIds isActive operatingCompanyIds accessAllOperatingCompanies').lean();
  if (!saved || saved.isActive === false) throw branchDenied('This user is no longer active.');
  if (user.activeOperatingCompanyId && saved.accessAllOperatingCompanies !== true &&
      !(saved.operatingCompanyIds || []).map(key).includes(key(user.activeOperatingCompanyId))) {
    throw branchDenied('Access to this operating company has been removed. Please sign in again.');
  }
  return { accessAllBranches: saved.accessAllBranches !== false, branchIds: (saved.branchIds || []).map(key) };
}

export async function validateBranchAssignment(companyId, body, previous = {}) {
  const all = body.accessAllBranches === undefined ? previous.accessAllBranches !== false : body.accessAllBranches;
  if (typeof all !== 'boolean') throw Object.assign(new Error('Choose All branches or Selected branches.'), { status: 400 });
  const selection = body.branchIds ?? previous.branchIds ?? [];
  if (!Array.isArray(selection)) throw Object.assign(new Error('Branch selection must be a list.'), { status: 400 });
  const ids = [...new Set(selection.map(key))];
  if (ids.some(id => !mongoose.isValidObjectId(id))) throw Object.assign(new Error('Invalid branch selection.'), { status: 400 });
  if (!all && !ids.length) throw Object.assign(new Error('Select at least one branch.'), { status: 400 });
  const valid = ids.length ? await Branch.countDocuments({ _id: { $in: ids }, companyId, isActive: { $ne: false } }) : 0;
  if (valid !== ids.length) throw Object.assign(new Error('Select active branches belonging to this company.'), { status: 400 });
  return { accessAllBranches: all, branchIds: all ? [] : ids };
}

// Load only identity/ownership columns, once per request. Relationships are
// resolved against the selected operating company; stale downstream branch
// snapshots cannot grant access. No database migration is required to restrict
// legacy records. Unresolvable legacy records are hidden from restricted users.
async function loadOwnership(user) {
  await Promise.all([
    import('@/app/api/order-panel/OrderPanel'), import('@/app/api/vehicle-negotiation/VehicleNegotiation'),
    import('@/app/api/pricing-panel/PricingPanel'), import('@/app/api/loading-panel/LoadingPanel'),
    import('@/app/api/purchase-panel/PurchasePanel'), import('@/app/api/Advance-Payment/AdvancePayment'),
    import('@/app/api/consignment-note/ConsignmentNote'), import('@/app/api/pod-panel/POD'),
    import('@/app/api/balance-payment/BalancePayment'), import('@/models/DriverTrip'),
    import('@/models/TrackingSession'), import('@/models/LocationPoint'), import('@/models/StopEpisode'),
  ]);
  const company = { companyId: user.companyId };
  const operating = user.type === 'company' && user.isGroupAdmin === true && !user.activeOperatingCompanyId ? {} : user.activeOperatingCompanyCode === 'JGL'
    ? { $or: [{ subCompanyId: user.activeOperatingCompanyId }, { subCompanyId: null }] }
    : { subCompanyId: user.activeOperatingCompanyId };
  const branches = await Branch.find(company).select('name code isActive').lean();
  const rows = new Map();
  const indices = new Map();
  await Promise.all(Object.entries(branchModels).map(async ([name, spec]) => {
    const Model = mongoose.models[name];
    // Tracking history can contain millions of points. Scope it by allowed
    // tripId at query time rather than loading its ids into the ownership graph.
    if (!Model || ['LocationPoint', 'StopEpisode', 'TrackingSession'].includes(name)) return;
    const filter = Model.schema.path('subCompanyId') ? { $and: [company, operating] } : company;
    const docs = await Model.find(filter).select(`_id companyId subCompanyId ${spec.number || ''} ${spec.select}`).lean();
    rows.set(name, docs);
    const index = new Map();
    for (const doc of docs) {
      index.set(key(doc._id), doc);
      if (doc[spec.number]) index.set(key(doc[spec.number]), doc);
    }
    indices.set(name, index);
  }));
  const lookup = (name, id) => indices.get(name)?.get(key(id));
  const graph = { rows, branches, lookup, resolve: makeOwnershipResolver({ lookup, branches }) };
  graph.remember = (name, doc) => {
    const index = indices.get(name) || new Map();
    indices.set(name, index);
    const previous = index.get(key(doc._id));
    const docs = rows.get(name) || [];
    if (previous) docs.splice(docs.indexOf(previous), 1);
    docs.push(doc);
    rows.set(name, docs);
    index.set(key(doc._id), doc);
    const number = branchModels[name]?.number;
    if (number && doc[number]) index.set(key(doc[number]), doc);
    graph.resolve = makeOwnershipResolver({ lookup, branches });
  };
  return graph;
}

export function withBranchAccess(handler) {
  return async function branchScopedRequest(req, ...args) {
    try {
      const auth = req.headers.get('authorization') || '';
      if (!auth.startsWith('Bearer ')) return await handler(req, ...args);
      let user;
      try { user = jwt.verify(auth.slice(7), process.env.JWT_SECRET); }
      catch { return await handler(req, ...args); }
      if (!['user', 'company'].includes(user.type)) return await handler(req, ...args);
      const access = await currentBranchAccess(user);
      if (user.type === 'user' && !user.activeOperatingCompanyId) throw branchDenied('Select an operating company before accessing transactions.');
      let ownership;
      const scope = {
        user, access,
        load: () => ownership ||= branchContext.run(undefined, () => loadOwnership(user)),
        async filter(model) {
          const Model = mongoose.models[model];
          const tenant = { companyId: new mongoose.Types.ObjectId(user.companyId) };
          const opId = user.activeOperatingCompanyId && new mongoose.Types.ObjectId(user.activeOperatingCompanyId);
          // Group overview/report routes deliberately support consolidated
          // company-admin reads. Ordinary users always need a selected company.
          if (user.type === 'company' && user.isGroupAdmin === true && !opId) return tenant;
          if (Model?.schema.path('subCompanyId')) {
            if (!opId) throw branchDenied('Select an operating company before accessing transactions.');
            tenant.$or = user.activeOperatingCompanyCode === 'JGL'
              ? [{ subCompanyId: opId }, { subCompanyId: null }]
              : [{ subCompanyId: opId }];
          }
          if (access.accessAllBranches && Model?.schema.path('subCompanyId')) return tenant;
          const graph = await this.load();
          const tripChild = ['LocationPoint', 'StopEpisode', 'TrackingSession'].includes(model);
          const ids = (graph.rows.get(tripChild ? 'DriverTrip' : model) || [])
            .filter(doc => {
              const ownership = graph.resolve(tripChild ? 'DriverTrip' : model, doc);
              return ownership?.length && canAccessBranches(access, ownership);
            }).map(doc => doc._id);
          return { ...tenant, [tripChild ? 'tripId' : '_id']: { $in: ids } };
        },
      };
      const response = await branchContext.run(scope, () => handler(req, ...args));
      if (response?.status >= 500) {
        const data = await response.clone().json().catch(() => ({}));
        const message = [data.message, data.error].find(value => typeof value === 'string' && value.startsWith('Branch access denied:'));
        if (message) throw branchDenied(message.slice('Branch access denied: '.length));
      }
      if (response?.headers) response.headers.set('Cache-Control', 'private, no-store');
      return response;
    } catch (error) {
      return Response.json({ success: false, message: error.message, code: error.code || 'BRANCH_ACCESS_ERROR' }, { status: error.status || 500 });
    }
  };
}
