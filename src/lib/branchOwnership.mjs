// Ownership follows transaction references, never pickup/delivery locations or
// a downstream panel's editable branch snapshot. Pure functions also power audits.
export const branchModels = {
  OrderPanel: { number: 'orderPanelNo', select: 'branch branchName branchCode' },
  VehicleNegotiation: { number: 'vnnNo', select: 'selectedOrderPanels orders.orderNo orders.orderPanelId' },
  PricingPanel: { number: 'pricingSerialNo', select: 'orders.vehicleNegotiationId orders.vnnNumber orders.orderNo' },
  LoadingPanel: { number: 'vehicleArrivalNo', select: 'vehicleNegotiationNo orderRows.orderPanelId orderRows.orderNo' },
  PurchasePanel: { number: 'purchaseNo', select: 'vehicleNegotiationId vnnNo loadingInfoNo header.orderNo orders.orderNo' },
  AdvancePayment: { number: 'paymentNo', select: 'purchaseId purchaseNo header.purchaseNo' },
  ConsignmentNote: { number: 'lrNo', select: 'vehicleNegotiationRef vnnNo loadingInfoNo header.orderNo consignmentBreakdown' },
  POD: { number: 'podNo', select: 'purchaseNo header.purchaseNo lrEntries.lrNo lrEntries.lrId purchaseOrders.orderNo' },
  BalancePayment: { number: 'balancePaymentNo', select: 'podNo purchaseNo orderRows.orderNo' },
  SavedReport: { number: 'reportId', select: 'data.lrNo data._id' },
  DriverTrip: { select: 'loadingId lrIds' },
  TrackingSession: { select: 'tripId' },
  LocationPoint: { select: 'tripId' },
  StopEpisode: { select: 'tripId' },
};

export const key = value => String(value?._id || value || '').trim();
const values = (...items) => [...new Set(items.flat(Infinity).map(key).flatMap(value => value.split(',').map(part => part.trim())).filter(Boolean))];
export function parentReferences(model, doc) {
  const refs = [];
  const add = (name, ...ids) => values(...ids).forEach(id => refs.push([name, id]));
  switch (model) {
    case 'VehicleNegotiation':
      for (const row of doc.selectedOrderPanels || []) add('OrderPanel', row._id || row.orderPanelNo);
      for (const row of doc.orders || []) add('OrderPanel', row.orderPanelId || row.orderNo);
      break;
    case 'PricingPanel':
      for (const row of doc.orders || []) {
        add('VehicleNegotiation', row.vehicleNegotiationId || row.vnnNumber);
        add('OrderPanel', row.orderNo);
      }
      break;
    case 'LoadingPanel':
      add('VehicleNegotiation', doc.vehicleNegotiationNo);
      for (const row of doc.orderRows || []) add('OrderPanel', row.orderPanelId || row.orderNo);
      break;
    case 'PurchasePanel':
      add('LoadingPanel', doc.loadingInfoNo);
      add('VehicleNegotiation', doc.vehicleNegotiationId || doc.vnnNo);
      add('OrderPanel', doc.header?.orderNo);
      for (const row of doc.orders || []) add('OrderPanel', row.orderNo);
      break;
    case 'AdvancePayment': add('PurchasePanel', doc.purchaseId || doc.purchaseNo || doc.header?.purchaseNo); break;
    case 'ConsignmentNote':
      add('LoadingPanel', doc.loadingInfoNo);
      add('VehicleNegotiation', doc.vehicleNegotiationRef || doc.vnnNo);
      // Also validate the LR's actual Order; do not trust a forged LR header.
      add('OrderPanel', doc.header?.orderNo);
      for (const row of doc.consignmentBreakdown || []) add('OrderPanel', row.orderNo);
      break;
    case 'POD':
      add('PurchasePanel', doc.purchaseNo || doc.header?.purchaseNo);
      for (const row of doc.lrEntries || []) add('ConsignmentNote', row.lrId || row.lrNo);
      for (const row of doc.purchaseOrders || []) add('OrderPanel', row.orderNo);
      break;
    case 'BalancePayment':
      add(doc.podNo ? 'POD' : 'PurchasePanel', doc.podNo || doc.purchaseNo);
      for (const row of doc.orderRows || []) add('OrderPanel', row.orderNo);
      break;
    case 'SavedReport':
      for (const row of doc.data || []) add('ConsignmentNote', row.lrNo || key(row._id).split('_')[0]);
      break;
    case 'DriverTrip': add('LoadingPanel', doc.loadingId); add('ConsignmentNote', doc.lrIds || []); break;
    case 'TrackingSession': case 'LocationPoint': case 'StopEpisode': add('DriverTrip', doc.tripId); break;
  }
  return [...new Map(refs.map(ref => [ref.join(':'), ref])).values()];
}

export function makeOwnershipResolver({ lookup, branches }) {
  const cache = new Map();
  function resolve(model, doc, trail = new Set()) {
    if (!doc || trail.has(`${model}:${key(doc._id)}`)) return null;
    const tag = `${model}:${key(doc._id)}`;
    if (cache.has(tag) && key(doc._id)) return cache.get(tag);
    const next = new Set(trail).add(tag);
    let result;
    if (model === 'OrderPanel') {
      const branch = branches.find(item => key(item._id) === key(doc.branch)) ||
        branches.find(item => item.code?.toUpperCase() === key(doc.branchCode).toUpperCase()) ||
        branches.find(item => item.name?.toLowerCase() === key(doc.branchName).toLowerCase());
      result = branch ? [key(branch._id)] : null;
    } else {
      const refs = parentReferences(model, doc);
      const parents = refs.map(([name, id]) => resolve(name, lookup(name, id), next));
      result = !parents.length || parents.some(parent => !parent?.length) ? null : values(...parents);
    }
    if (key(doc._id)) cache.set(tag, result);
    return result;
  }
  return resolve;
}

export function canAccessBranches(access, ownership) {
  return access.accessAllBranches !== false ||
    Boolean(ownership?.length && ownership.every(id => (access.branchIds || []).map(key).includes(key(id))));
}

// A cascade must not silently omit a dependent record merely because its
// combined ownership makes it invisible to the initiating user.
export function hasInaccessibleDependent(graph, model, doc, access) {
  if (access.accessAllBranches !== false) return false;
  const visited = new Set([`${model}:${key(doc._id)}`]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, rows] of graph.rows) for (const row of rows) {
      const tag = `${name}:${key(row._id)}`;
      if (visited.has(tag)) continue;
      const linked = parentReferences(name, row).some(([parent, ref]) => {
        const source = graph.lookup(parent, ref);
        return source && visited.has(`${parent}:${key(source._id)}`);
      });
      if (!linked) continue;
      if (!canAccessBranches(access, graph.resolve(name, row))) return true;
      visited.add(tag);
      changed = true;
    }
  }
  return false;
}
