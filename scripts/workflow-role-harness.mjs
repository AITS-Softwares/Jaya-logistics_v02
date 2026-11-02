import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as loading from '../src/lib/loadingApprovalWorkflow.mjs';
import * as presentation from '../src/lib/reapprovalPresentation.mjs';
import * as permissions from '../src/lib/reapprovalPermissions.mjs';
import * as packs from '../src/lib/reapprovalPacks.mjs';
import * as weight from '../src/lib/lrWeight.mjs';
import * as photos from '../src/lib/loadingPhotoPolicy.mjs';
import * as cancellation from '../src/lib/orderCancellationPolicy.mjs';
import * as loadingSync from '../src/lib/loadingVnnSync.mjs';
const require = createRequire(import.meta.url), parser = require('@babel/parser'), odm = require('mongoose');
export const oid = () => new odm.Types.ObjectId().toString();
export const panels = [
  ['order', 'Order Panel', 'OrderPanel', 'order-panel', 'orderPanelNo'],
  ['vnn', 'Vehicle Negotiation', 'VehicleNegotiation', 'vehicle-negotiation', 'vnnNo'],
  ['pricing', 'Pricing Panel', 'PricingPanel', 'pricing-panel', 'pricingSerialNo'],
  ['loading', 'Loading Info', 'LoadingPanel', 'loading-panel', 'vehicleArrivalNo'],
  ['lr', 'Consignment Note', 'ConsignmentNote', 'consignment-note', 'lrNo'],
];
export function plain(value) {
  if (Array.isArray(value)) return value.map(plain);
  if (value instanceof Date) return new Date(value);
  if (value?._bsontype === 'ObjectId') return String(value);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key, value]) => typeof value !== 'function' && key !== '$locals').map(([key, value]) => [key, plain(value)]));
}
const values = (value, path) => !path.length ? [value] : Array.isArray(value) ? value.flatMap(item => values(item, path)) : values(value?.[path[0]], path.slice(1));
const equal = (a, b) => String(a ?? '') === String(b ?? '');
export function matches(doc, filter = {}) {
  return Object.entries(filter).every(([key, wanted]) => {
    if (key === '$and') return wanted.every(condition => matches(doc, condition));
    if (key === '$or') return wanted.some(condition => matches(doc, condition));
    const found = values(doc, key.split('.'));
    if (wanted && typeof wanted === 'object' && !Array.isArray(wanted)) {
      return Object.entries(wanted).every(([op, value]) => {
        if (op === '$in') return found.some(item => value.some(candidate => equal(candidate, item)));
        if (op === '$nin') return found.every(item => !value.some(candidate => equal(candidate, item)));
        if (op === '$ne') return found.every(item => !equal(item, value));
        if (op === '$elemMatch') return found.some(items => (items || []).some(item => matches(item, value)));
        if (op === '$not') return !matches(doc, { [key]: value });
        if (op === '$exists') return found.some(item => item !== undefined) === value;
        if (op === '$regex') return found.some(item => new RegExp(value, wanted.$options || '').test(String(item || '')));
        if (op === '$options') return true;
        throw new Error(`Unsupported fixture query ${op}`);
      });
    }
    return found.some(item => equal(item, wanted));
  });
}
function setPath(doc, path, value) { const parts = path.split('.'); let target = doc; for (const key of parts.slice(0, -1)) target = target[key] ||= {}; target[parts.at(-1)] = value; }
export function makeHarness() {
  const tenant = oid(), operating = oid(), branch = oid(), customer = oid();
  const tables = {}, notifications = [], audits = [], identities = new Map();
  const actor = (module, action, label = `${module}-${action}`) => {
    const user = { id: oid(), name: label, companyId: tenant, type: 'user', activeOperatingCompanyId: operating, activeOperatingCompanyCode: 'TEST', roles: [], accessAllBranches: true, accessAllOperatingCompanies: true, modules: { [module]: { selected: true, permissions: { view: true, [action]: true } } } };
    identities.set(user.id, user); return user;
  };
  const users = Object.fromEntries(panels.map(([type, module]) => [type, {
    creator: actor(module, 'create'), editor: actor(module, 'edit'), approver: actor(type === 'pricing' ? 'Pricing Panel - Part 2 Approval' : module, 'approve'), viewer: actor(module, 'view'),
  }]));
  const admin = { ...actor('Administration', 'view', 'Admin'), roles: ['Admin'] }; identities.set(admin.id, admin);
  function document(fields) { return { _id: oid(), companyId: tenant, subCompanyId: operating, branch, reapprovalState: 'none', reapprovalHistory: [], upstreamPending: [], sourceDependencies: [], $locals: {}, ...fields, toObject() { return plain(this); }, set(key, value) { setPath(this, key, value); }, async save() { return this; }, $session() {}, increment() {} }; }
  function query(resolve) { const q = { session() { return q; }, select() { return q; }, sort() { return q; }, limit() { return q; }, populate() { return q; }, setOptions() { return q; }, lean: async () => resolve(), then: (yes, no) => Promise.resolve().then(resolve).then(yes, no) }; return q; }
  function model(name) {
    tables[name] ||= [];
    const Model = function(fields) { const doc = document(fields); doc.constructor = Model; tables[name].push(doc); return doc; };
    Model.find = filter => query(() => tables[name].filter(doc => matches(doc, filter)));
    Model.findOne = filter => query(() => tables[name].find(doc => matches(doc, filter)) || null);
    Model.exists = async filter => tables[name].some(doc => matches(doc, filter));
    Model.updateOne = async (filter, update) => { const doc = tables[name].find(doc => matches(doc, filter)); if (doc) apply(doc, update); return { matchedCount: Number(!!doc) }; };
    Model.updateMany = async (filter, update) => { for (const doc of tables[name].filter(doc => matches(doc, filter))) apply(doc, update); };
    Model.findOneAndUpdate = (filter, update) => query(() => { const doc = tables[name].find(doc => matches(doc, filter)); if (doc) apply(doc, update); return doc; });
    Model.collection = { updateOne: Model.updateOne };
    return Model;
  }
  function apply(doc, update) {
    for (const [key, value] of Object.entries(update.$set || {})) setPath(doc, key, value);
    for (const [key, value] of Object.entries(update.$addToSet || {})) { doc[key] ||= []; if (!doc[key].some(item => JSON.stringify(item) === JSON.stringify(value))) doc[key].push(value); }
    for (const [key, value] of Object.entries(update.$push || {})) (doc[key] ||= []).push(value);
  }
  const env = {
    ...loading, ...presentation, ...permissions, ...packs, ...weight, ...photos, ...cancellation, ...loadingSync,
    console: { ...console, log() {}, error(message, error) { if (error?.status >= 400 && error?.status < 500) return; console.error(message, error); } },
    mongoose: { ...odm, startSession: async () => ({ withTransaction: async work => work(), endSession: async () => {} }) },
    NextResponse: { json: (body, options = {}) => ({ ...body, status: options.status || 200 }) },
    connectDb: async () => {}, dbConnect: async () => {}, withBranchAccess: handler => handler,
    getTokenFromHeader: req => req.actor?.id, verifyJWT: token => identities.get(token), verifyToken: req => req.actor,
    activeOperatingCompanyId: user => { if (!user?.activeOperatingCompanyId) throw new Error('Select operating company'); return user.activeOperatingCompanyId; },
    companyScopeFilter: (user, filter = {}) => ({ $and: [filter, { companyId: user.companyId, subCompanyId: user.activeOperatingCompanyId }] }),
    identifierFormatError: () => null, validateOrderWeights: () => null, missingOrderDropRows: () => [], validatePackDropLocations: () => ({ ok: true }),
    captureSourceDependencies: async () => {}, assertSourcesCurrent: async () => {},
    recordApprovedRevision: async (type, id) => { const doc = tables[panels.find(panel => panel[0] === type)[2]].find(doc => doc._id === id); doc.reapprovalState = 'none'; doc.approvedRevision = (doc.approvedRevision || 0) + 1; },
    reconcileOrderCancellations: async () => {},
    notifyModuleCreateUsers: async () => {}, syncOperationalDriverProfile: async () => {},
    getBilledLrNumbers: async () => [],
    notificationBranchSource: async () => ({ ownership: [branch] }), canAccessBranches: () => true, key: value => String(value),
    branchContext: { getStore: () => ({ user: { activeOperatingCompanyId: operating } }) },
    safeNotificationUrl: value => value || '/admin',
    approvedPricingForLr: async () => true,
    findLRsForPanel: async () => [], getLRCompletion: () => ({ total: 0, allReady: false }),
    getConsignmentReadyForLoading: async () => false,
  };
  for (const name of [...panels.map(panel => panel[2]), 'PurchasePanel', 'AdvancePayment', 'POD', 'BalancePayment', 'Customer', 'CompanyUser', 'Notification']) env[name] = model(name);
  env.CustomerModel = env.Customer;
  tables.Customer.push(document({ _id: customer, customerName: 'Test customer' }));
  env.CompanyUser.find = () => query(() => [...identities.values()].map(user => ({ ...user, _id: user.id })));
  env.Notification.insertMany = async records => notifications.push(...records);
  env.ReapprovalAudit = { create: async records => audits.push(...(Array.isArray(records) ? records : [records])) };
  function compile(file, names, extra = {}) {
    let source = fs.readFileSync(file, 'utf8');
    const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
    const deps = { ...env, ...extra };
    for (const node of ast.program.body.filter(node => node.type === 'ImportDeclaration')) for (const spec of node.specifiers) if (!(spec.local.name in deps)) deps[spec.local.name] = (...args) => { throw new Error(`Unconfigured test dependency: ${spec.local.name}`); };
    source = source.replace(/^import .*;\r?\n/gm, '').replace(/^export (default )?/gm, '');
    return new Function(...Object.keys(deps), `${source}\nreturn { ${names.join(', ')} };`)(...Object.values(deps));
  }
  const authAst = parser.parse(fs.readFileSync('src/lib/auth.js', 'utf8'), { sourceType: 'module' });
  const authSource = fs.readFileSync('src/lib/auth.js', 'utf8');
  const declarations = authAst.program.body.map(node => node.declaration || node).filter(node => node.type === 'FunctionDeclaration' && ['hasPermission', 'hasAnyPermission', 'withAuth'].includes(node.id.name));
  Object.assign(env, new Function('verifyToken', declarations.map(node => authSource.slice(node.start, node.end)).join('\n') + '\nreturn { hasPermission, hasAnyPermission, withAuth };')(env.verifyToken));
  Object.assign(env, compile('src/lib/workflowNotifications.js', ['notifyModulePermissionUsers', 'notifyModuleApprovers', 'notifyModuleDecision', 'notifyModuleCreateUsers']));
  const request = (actor, body = {}) => ({ actor, url: 'http://offline.test/api', json: async () => structuredClone(body) });
  const fixtures = {};
  function reset() {
    notifications.length = 0; audits.length = 0;
    for (const [type, , name, , number] of panels) {
      const rowId = fixtures.order?.plantRows[0]._id || oid();
      const doc = document({ [number]: `${type.toUpperCase()}-1`, panelStatus: 'Approved', approvedRevision: 1, customerId: customer, createdBy: users[type].creator.id, plantRows: [{ _id: rowId, status: 'Open', statusHistory: [], plantName: 'Plant', fromName: 'A', toName: 'B', weight: 5 }], orders: [], orderRows: [], packData: { PALLETIZATION: [], 'UNIFORM - BAGS/BOXES': [], 'LOOSE - CARGO': [], 'NON-UNIFORM - GENERAL CARGO': [] }, approval: { part1Status: 'Approved', part3Status: 'Approved', rateType: 'Per MT' }, negotiation: {}, workflow: { part1Locked: true, audit: [] }, header: { status: 'Approved', orderNo: 'ORDER-1' }, rateApproval: { approvalStatus: 'Approved', workflowPhase: 'approved', approvalRevision: 1, approvedRevision: 1, approvalHistory: [] }, loadingWorkflow: { version: 2, currentPart: 2, part1Status: 'Approved', part2Status: 'Approved' }, vbpUploads: {}, vftUploads: {}, vlUploads: {}, votUploads: {}, loadedWeighment: {}, vehicleInfo: { vehicleNo: 'TEST01' }, isDraft: false });
      fixtures[type] = doc; tables[name] = [doc];
      doc.plantRows.id = value => doc.plantRows.find(row => String(row._id) === String(value));
    }
    const row = { orderNo: fixtures.order.orderPanelNo, orderPanelId: fixtures.order._id, orderRowId: fixtures.order.plantRows[0]._id, plantName: 'Plant', fromName: 'A', toName: 'B', weight: 5, locationRate: 'B', priceList: 'Rates', rate: 100 };
    fixtures.vnn.orders = [{ ...row }]; fixtures.pricing.orders = [{ ...row, _id: oid(), vehicleNegotiationId: fixtures.vnn._id }]; fixtures.loading.orderRows = [{ ...row }]; fixtures.loading.vehicleNegotiationNo = fixtures.vnn.vnnNo; fixtures.lr.orderRowId = row.orderRowId; fixtures.lr.header.orderNo = row.orderNo; fixtures.lr.loadingInfoNo = fixtures.loading.vehicleArrivalNo;
    delete fixtures.lr.orderRows;
    for (const prefix of ['vbp', 'vft', 'vot', 'vl']) fixtures.loading[`${prefix}Uploads`] = Object.fromEntries(Array.from({ length: prefix === 'vl' ? 5 : 3 }, (_, index) => [`${prefix}${index + 1}`, `/saved-${prefix}-${index + 1}.jpg`]));
    for (const doc of Object.values(fixtures)) doc.approvedSnapshot = doc.toObject();
  }
  reset();
  return { env, compile, request, actor, users, admin, identities, tables, notifications, audits, fixtures, document, reset, tenant, operating, branch, customer };
}
