import mongoose from 'mongoose';
import OrderPanel from '@/app/api/order-panel/OrderPanel';
import VehicleNegotiation from '@/app/api/vehicle-negotiation/VehicleNegotiation';
import PricingPanel from '@/app/api/pricing-panel/PricingPanel';
import LoadingPanel from '@/app/api/loading-panel/LoadingPanel';
import ConsignmentNote from '@/app/api/consignment-note/ConsignmentNote';
import ReapprovalAudit from '@/models/ReapprovalAudit';
import { notifyModulePermissionUsers } from '@/lib/workflowNotifications';
import { orderSourceRevisions, packProjection, syncPacksFromOrders } from '@/lib/reapprovalPacks.mjs';
import { companyScopeFilter } from '@/lib/companyScope';
import { withLrCargoWeight } from '@/lib/lrWeight.mjs';

const SOURCES = {
  order: { Model: OrderPanel, label: 'Order Panel', number: 'orderPanelNo' },
  vnn: { Model: VehicleNegotiation, label: 'Vehicle Negotiation', number: 'vnnNo' },
  pricing: { Model: PricingPanel, label: 'Pricing Panel', number: 'pricingSerialNo' },
  loading: { Model: LoadingPanel, label: 'Loading Info', number: 'vehicleArrivalNo' },
  lr: { Model: ConsignmentNote, label: 'Consignment Note', number: 'lrNo' },
};
const SOURCE_MODELS = { order: OrderPanel, vnn: VehicleNegotiation, pricing: PricingPanel, loading: LoadingPanel, lr: ConsignmentNote };
const TARGETS = {
  vnn: { Model: VehicleNegotiation, module: 'Vehicle Negotiation', path: 'vehicle-negotiation', number: 'vnnNo' },
  pricing: { Model: PricingPanel, module: 'Pricing Panel', path: 'pricing-panel', number: 'pricingSerialNo' },
  loading: { Model: LoadingPanel, module: 'Loading Info', path: 'Loading-Info', number: 'vehicleArrivalNo' },
  lr: { Model: ConsignmentNote, module: 'Consignment Note', path: 'Consignment-Note', number: 'lrNo' },
};
const asString = (value) => String(value ?? '').trim();
const same = (a, b) => asString(a) === asString(b);
const toPlain = (doc) => doc?.toObject ? doc.toObject({ depopulate: true }) : structuredClone(doc);
const storedSnapshot = (doc) => {
  const value = toPlain(doc);
  delete value.__v;
  delete value.updatedAt;
  return value;
};
const normalizedObject = (value) => JSON.stringify(value, (_key, item) => item?._bsontype === 'ObjectId' ? String(item) : item);
const approvedRevisionFor = (type, record) => type === 'pricing'
  ? Number(record?.rateApproval?.approvedRevision) || Number(record?.approvedRevision) || 0
  : Number(record?.approvedRevision) || 0;

function mirroredProjection(type, doc) {
  if (type === 'order') return {
    branchName: doc.branchName, partyName: doc.partyName, customerName: doc.customerName,
    packData: packProjection(doc), activePack: doc.activePack,
    plantRows: (doc.plantRows || []).map((row) => ({ id: String(row._id), plantCode: row.plantCode, plantName: row.plantName, plantCodeValue: row.plantCodeValue, orderType: row.orderType, pinCode: row.pinCode, fromName: row.fromName, fromState: row.fromState, toName: row.toName, locationRemark: row.locationRemark, weight: row.weight, talukaName: row.talukaName, districtName: row.districtName, stateName: row.stateName, countryName: row.countryName })),
  };
  if (type === 'vnn') return {
    orderSourceRevisions: orderSourceRevisions(doc),
    branch: doc.branch, branchName: doc.branchName, branchCode: doc.branchCode,
    date: doc.date, customerName: doc.customerName, partyName: doc.partyName,
    customerId: doc.customerId, delivery: doc.delivery, subCompanyId: doc.subCompanyId,
    subCompanyName: doc.subCompanyName, subCompanyCode: doc.subCompanyCode,
    billingType: doc.billingType, loadingPoints: doc.loadingPoints, dropPoints: doc.dropPoints,
    collectionCharges: doc.collectionCharges, cancellationCharges: doc.cancellationCharges,
    loadingCharges: doc.loadingCharges, otherCharges: doc.otherCharges,
    vehicleNo: doc.approval?.vehicleNo, vendorName: doc.approval?.vendorName, mobile: doc.approval?.mobile,
    orders: (doc.orders || []).map((row) => ({
      id: row.orderRowId, orderNo: row.orderNo, partyName: row.partyName, customerId: row.customerId,
      customerCode: row.customerCode, contactPerson: row.contactPerson, plantCode: row.plantCode,
      plantCodeValue: row.plantCodeValue, plantName: row.plantName, orderType: row.orderType,
      pinCode: row.pinCode, country: row.country, countryName: row.countryName, state: row.state,
      stateName: row.stateName, district: row.district, districtName: row.districtName,
      taluka: row.taluka, talukaName: row.talukaName, from: row.from, fromName: row.fromName,
      fromState: row.fromState, to: row.to, toName: row.toName, weight: row.weight,
      locationRemark: row.locationRemark, localStatus: row.localStatus, localStatusLabel: row.localStatusLabel,
      collectionCharges: row.collectionCharges, cancellationCharges: row.cancellationCharges,
      loadingCharges: row.loadingCharges, otherCharges: row.otherCharges,
      subCompanyId: row.subCompanyId, subCompanyName: row.subCompanyName, subCompanyCode: row.subCompanyCode,
    })),
  };
  if (type === 'loading') return {
    vehicleNo: doc.vehicleInfo?.vehicleNo, vehicleOwnerName: doc.vehicleInfo?.vehicleOwnerName,
    driverName: doc.vehicleInfo?.driverName, driverMobileNo: doc.vehicleInfo?.driverMobileNo,
    orderRows: (doc.orderRows || []).map((row) => ({ id: row.orderRowId, orderNo: row.orderNo, partyName: row.partyName, plantCodeValue: row.plantCodeValue, plantName: row.plantName, orderType: row.orderType, pinCode: row.pinCode, fromName: row.fromName, fromState: row.fromState, toName: row.toName, weight: row.weight })),
  };
  if (type === 'pricing') return {
    branch: doc.branch, branchName: doc.branchName, branchCode: doc.branchCode,
    date: doc.date, partyName: doc.partyName, customerId: doc.customerId,
    delivery: doc.delivery, subCompanyId: doc.subCompanyId, subCompanyName: doc.subCompanyName, subCompanyCode: doc.subCompanyCode,
    billingType: doc.billingType, loadingPoints: doc.loadingPoints, dropPoints: doc.dropPoints,
    collectionCharges: doc.collectionCharges, cancellationCharges: doc.cancellationCharges,
    loadingCharges: doc.loadingCharges, otherCharges: doc.otherCharges,
    orders: (doc.orders || []).map((row) => ({
      id: String(row.orderRowId || ''), orderNo: row.orderNo, partyName: row.partyName,
      customerId: row.customerId, customerCode: row.customerCode, contactPerson: row.contactPerson,
      plantCode: row.plantCode, plantName: row.plantName, plantCodeValue: row.plantCodeValue,
      orderType: row.orderType, pinCode: row.pinCode, country: row.country, countryName: row.countryName,
      state: row.state, stateName: row.stateName, district: row.district, districtName: row.districtName,
      taluka: row.taluka, talukaName: row.talukaName, from: row.from, fromName: row.fromName,
      fromState: row.fromState, to: row.to, toName: row.toName, weight: row.weight,
      locationRemark: row.locationRemark, localStatus: row.localStatus, localStatusLabel: row.localStatusLabel,
      collectionCharges: row.collectionCharges, cancellationCharges: row.cancellationCharges,
      loadingCharges: row.loadingCharges, otherCharges: row.otherCharges,
      subCompanyId: row.subCompanyId, subCompanyName: row.subCompanyName, subCompanyCode: row.subCompanyCode,
      rate: row.rate, totalAmount: row.totalAmount, locationRate: row.locationRate, priceList: row.priceList,
    })),
  };
  return {};
}

function copyOrderRow(source, target) {
  const fields = ['orderNo', 'partyName', 'plantCodeValue', 'plantName', 'orderType', 'pinCode', 'fromName', 'fromState', 'toName', 'locationRemark', 'weight', 'talukaName', 'districtName', 'stateName', 'countryName'];
  for (const field of fields) if (source[field] !== undefined) target[field] = source[field];
}

async function findDirectChildren(type, doc, session) {
  const companyId = doc.companyId;
  if (type === 'order') {
    const rowIds = (doc.plantRows || []).map((row) => String(row._id));
    const records = await VehicleNegotiation.find({ companyId, $or: [
      { 'orders.orderPanelId': String(doc._id) },
      ...(rowIds.length ? [{ 'orders.orderRowId': { $in: rowIds } }] : []),
      { 'orders.orderNo': doc.orderPanelNo },
    ] }).session(session);
    return records.map((record) => ({ type: 'vnn', record }));
  }
  if (type === 'vnn') {
    const [pricings, loadings, lrs] = await Promise.all([
      PricingPanel.find({ companyId, $or: [{ 'orders.vehicleNegotiationId': doc._id }, { 'orders.vehicleNegotiationId': String(doc._id) }, { 'orders.vnnNumber': doc.vnnNo }] }).session(session),
      LoadingPanel.find({ companyId, vehicleNegotiationNo: doc.vnnNo }).session(session),
      ConsignmentNote.find({ companyId, $or: [
        ...(doc.vnnNo ? [{ vnnNo: doc.vnnNo }] : []),
        ...(doc._id ? [{ vehicleNegotiationRef: doc._id }] : []),
      ] }).session(session),
    ]);
    return [...pricings.map((record) => ({ type: 'pricing', record })), ...loadings.map((record) => ({ type: 'loading', record })), ...lrs.map((record) => ({ type: 'lr', record }))];
  }
  return [];
}

function pricingRelevantVnnProjection(vnn) {
  return {
    branch: vnn?.branch, branchName: vnn?.branchName, branchCode: vnn?.branchCode,
    date: vnn?.date, customerName: vnn?.customerName,
    partyName: vnn?.partyName, customerId: vnn?.customerId, delivery: vnn?.delivery,
    subCompanyId: vnn?.subCompanyId, subCompanyName: vnn?.subCompanyName,
    subCompanyCode: vnn?.subCompanyCode, billingType: vnn?.billingType,
    loadingPoints: vnn?.loadingPoints, dropPoints: vnn?.dropPoints,
    collectionCharges: vnn?.collectionCharges, cancellationCharges: vnn?.cancellationCharges,
    loadingCharges: vnn?.loadingCharges, otherCharges: vnn?.otherCharges,
  };
}

function pricingRelevantVnnRowProjection(row) {
  return {
    orderNo: row?.orderNo, partyName: row?.partyName, customerId: row?.customerId,
    customerCode: row?.customerCode, contactPerson: row?.contactPerson,
    plantCode: row?.plantCode, plantName: row?.plantName, plantCodeValue: row?.plantCodeValue,
    orderType: row?.orderType, pinCode: row?.pinCode, country: row?.country, countryName: row?.countryName,
    state: row?.state, stateName: row?.stateName, district: row?.district, districtName: row?.districtName,
    taluka: row?.taluka, talukaName: row?.talukaName, from: row?.from, fromName: row?.fromName,
    fromState: row?.fromState, to: row?.to, toName: row?.toName, weight: row?.weight,
    locationRemark: row?.locationRemark, localStatus: row?.localStatus, localStatusLabel: row?.localStatusLabel,
    collectionCharges: row?.collectionCharges, cancellationCharges: row?.cancellationCharges,
    loadingCharges: row?.loadingCharges, otherCharges: row?.otherCharges,
  };
}

function findPricingSourceRow(vnn, target) {
  const rows = vnn?.orders || [];
  if (target.orderRowId) return rows.find((row) => same(row.orderRowId, target.orderRowId)) || null;
  const candidates = rows.filter((row) => same(row.orderNo, target.orderNo) && same(row.plantCodeValue || row.plantName, target.plantCodeValue || target.plantName) && same(row.toName, target.toName));
  return candidates.length === 1 ? candidates[0] : null;
}

function syncPricingFromVnn(vnn, priorVnn, pricing) {
  const beforeProjection = pricingRelevantVnnProjection(priorVnn || {});
  const afterProjection = pricingRelevantVnnProjection(vnn);
  let affected = normalizedObject(beforeProjection) !== normalizedObject(afterProjection);
  const dependencies = (pricing.sourceDependencies || []).filter((dependency) => !(dependency.panel === 'vnn' && String(dependency.recordId) === String(vnn._id)));
  dependencies.push({ panel: 'vnn', recordId: String(vnn._id), recordNo: vnn.vnnNo, rowId: '', revision: Number(vnn.approvedRevision) || 0 });
  pricing.sourceDependencies = dependencies;
  if (!affected) return { affected: false, matched: 0, ambiguous: false };

  const headerFields = ['branch', 'branchName', 'branchCode', 'date', 'customerId', 'delivery', 'subCompanyId', 'subCompanyName', 'subCompanyCode', 'billingType', 'loadingPoints', 'dropPoints', 'collectionCharges', 'cancellationCharges', 'loadingCharges', 'otherCharges'];
  for (const field of headerFields) if (vnn[field] !== undefined) pricing[field] = vnn[field];
  pricing.partyName = vnn.customerName || vnn.partyName || pricing.partyName;
  const copyFields = ['orderNo', 'partyName', 'customerId', 'customerCode', 'contactPerson', 'plantCode', 'plantName', 'plantCodeValue', 'orderType', 'pinCode', 'country', 'countryName', 'state', 'stateName', 'stateId', 'district', 'districtName', 'districtId', 'taluka', 'talukaName', 'talukaId', 'from', 'fromName', 'fromState', 'to', 'toName', 'weight', 'locationRemark', 'localStatus', 'localStatusLabel', 'collectionCharges', 'cancellationCharges', 'loadingCharges', 'otherCharges', 'subCompanyId', 'subCompanyName', 'subCompanyCode'];
  let matched = 0;
  let ambiguous = false;
  const matchedSourceRows = new Set();
  let needsRateReview = false;
  for (const target of pricing.orders || []) {
    const source = findPricingSourceRow(vnn, target);
    const priorSource = findPricingSourceRow(priorVnn, target);
    if (!source || !priorSource) {
      affected = true;
      ambiguous = true;
      continue;
    }
    const sourceKey = String(source.orderRowId || source._id || '');
    if (sourceKey && matchedSourceRows.has(sourceKey)) ambiguous = true;
    if (sourceKey) matchedSourceRows.add(sourceKey);
    if (normalizedObject(pricingRelevantVnnRowProjection(priorSource)) !== normalizedObject(pricingRelevantVnnRowProjection(source))) affected = true;
    if (!same(target.fromName, source.fromName) || !same(target.toName, source.toName) || Number(target.weight) !== Number(source.weight)) needsRateReview = true;
    if (source.orderRowId) target.orderRowId = source.orderRowId;
    for (const field of copyFields) if (source[field] !== undefined) target[field] = source[field];
    // Preserve the pricing team's rate selections; refresh derived line totals using the saved rate.
    target.totalAmount = (Number(target.weight) || 0) * (Number(target.rate) || 0);
    matched++;
  }
  pricing.totalWeight = (pricing.orders || []).reduce((sum, row) => sum + (Number(row.weight) || 0), 0);
  pricing.totalAmount = (pricing.orders || []).reduce((sum, row) => sum + (Number(row.totalAmount) || 0), 0);
  return { affected, matched, ambiguous, needsRateReview };
}

/** Capture explicit source IDs/row IDs for new records; don't infer fuzzy matches later. */
export async function captureSourceDependencies(type, doc, companyId) {
  const dependencies = [];
  const add = (panel, source) => {
    if (!source?._id) return;
    dependencies.push({ panel, recordId: String(source._id), recordNo: source.orderPanelNo || source.vnnNo || source.vehicleArrivalNo || source.lrNo || '', rowId: '', revision: Number(source.approvedRevision) || 0 });
  };
  if (type === 'vnn') {
    const orderIds = [...new Set((doc.orders || []).map((row) => String(row.orderPanelId || '')).filter(Boolean))];
    const orderNos = [...new Set((doc.orders || []).map((row) => row.orderNo).filter(Boolean))];
    const sources = await OrderPanel.find({ companyId, $or: [...(orderIds.length ? [{ _id: { $in: orderIds.filter(mongoose.isValidObjectId) } }] : []), ...(orderNos.length ? [{ orderPanelNo: { $in: orderNos } }] : [])] }).select('_id orderPanelNo approvedRevision').lean();
    for (const source of sources) {
      const rows = (doc.orders || []).filter((row) => String(row.orderPanelId || '') === String(source._id) || row.orderNo === source.orderPanelNo);
      for (const row of rows) dependencies.push({ panel: 'order', recordId: String(source._id), recordNo: source.orderPanelNo, rowId: String(row.orderRowId || ''), revision: Number(source.approvedRevision) || 0 });
    }
  } else if (type === 'loading') {
    if (doc.vehicleNegotiationNo) {
      const vnn = await VehicleNegotiation.findOne({ companyId, vnnNo: doc.vehicleNegotiationNo }).select('_id vnnNo approvedRevision').lean();
      add('vnn', vnn);
    }
    const orderIds = [...new Set((doc.orderRows || []).map((row) => String(row.orderPanelId || '')).filter(Boolean))];
    const orderNos = [...new Set((doc.orderRows || []).map((row) => row.orderNo).filter(Boolean))];
    const sources = await OrderPanel.find({ companyId, $or: [...(orderIds.length ? [{ _id: { $in: orderIds.filter(mongoose.isValidObjectId) } }] : []), ...(orderNos.length ? [{ orderPanelNo: { $in: orderNos } }] : [])] }).select('_id orderPanelNo approvedRevision').lean();
    for (const source of sources) for (const row of (doc.orderRows || []).filter((item) => String(item.orderPanelId || '') === String(source._id) || item.orderNo === source.orderPanelNo)) dependencies.push({ panel: 'order', recordId: String(source._id), recordNo: source.orderPanelNo, rowId: String(row.orderRowId || ''), revision: Number(source.approvedRevision) || 0 });
  } else if (type === 'pricing') {
    const vnnIds = [...new Set((doc.orders || []).map((row) => String(row.vehicleNegotiationId || '')).filter(mongoose.isValidObjectId))];
    const vnnNos = [...new Set((doc.orders || []).map((row) => row.vnnNumber).filter(Boolean))];
    if (vnnIds.length || vnnNos.length) {
      const vnns = await VehicleNegotiation.find({ companyId, $or: [...(vnnIds.length ? [{ _id: { $in: vnnIds } }] : []), ...(vnnNos.length ? [{ vnnNo: { $in: vnnNos } }] : [])] }).select('_id vnnNo approvedRevision').lean();
      for (const vnn of vnns) add('vnn', vnn);
    }
  } else if (type === 'lr') {
    const vnn = doc.vehicleNegotiationRef
      ? await VehicleNegotiation.findOne({ companyId, _id: doc.vehicleNegotiationRef }).select('_id vnnNo approvedRevision').lean()
      : doc.vnnNo
        ? await VehicleNegotiation.findOne({ companyId, vnnNo: doc.vnnNo }).select('_id vnnNo approvedRevision').lean()
        : null;
    add('vnn', vnn);
    if (doc.orderRowId) {
      const order = await OrderPanel.findOne({ companyId, 'plantRows._id': doc.orderRowId }).select('_id orderPanelNo approvedRevision').lean();
      if (order) dependencies.push({ panel: 'order', recordId: String(order._id), recordNo: order.orderPanelNo, rowId: String(doc.orderRowId), revision: Number(order.approvedRevision) || 0 });
    } else if (doc.header?.orderNo) {
      const order = await OrderPanel.findOne({ companyId, orderPanelNo: doc.header.orderNo }).select('_id orderPanelNo approvedRevision').lean();
      if (order) dependencies.push({ panel: 'order', recordId: String(order._id), recordNo: order.orderPanelNo, rowId: '', revision: Number(order.approvedRevision) || 0 });
    }
  }
  doc.sourceDependencies = dependencies;
  await doc.save();
  return dependencies;
}

function linkedVnnOrderReferences(record) {
  const orderRows = record.orders || [];
  return {
    ids: new Set(orderRows.map((row) => asString(row.orderPanelId)).filter(Boolean)),
    numbers: new Set(orderRows.map((row) => normalizedValue(row.orderNo)).filter(Boolean)),
  };
}

function currentVnnOrderReferences(record) {
  const rows = record?.orders || [];
  return {
    ids: new Set(rows.map((row) => asString(row.orderPanelId)).filter(Boolean)),
    numbers: new Set(rows.map((row) => normalizedValue(row.orderNo)).filter(Boolean)),
  };
}

/** Return order-origin blockers whose order is no longer linked to this VNN. */
export function findDetachedVnnOrderMarkers(record) {
  if (!record || !Array.isArray(record.upstreamPending) || !record.upstreamPending.length) return [];
  const { ids, numbers } = linkedVnnOrderReferences(record);
  return record.upstreamPending.filter((marker) => marker.panel === 'order'
    && !ids.has(asString(marker.recordId)) && !numbers.has(normalizedValue(marker.recordNo)));
}

/** Find Order blockers that no longer belong to a Loading Info record's linked VNN. */
export async function findDetachedLoadingOrderMarkers(record, companyId) {
  if (!record?._id || !companyId || !record.vehicleNegotiationNo) return [];
  const linkedVnn = await VehicleNegotiation.findOne({ companyId, vnnNo: record.vehicleNegotiationNo }).select('orders selectedOrderPanels').lean();
  if (!linkedVnn) return [];
  const { ids, numbers } = currentVnnOrderReferences(linkedVnn);
  return (record.upstreamPending || []).filter((marker) => marker.panel === 'order' && !marker.reason
    && !ids.has(asString(marker.recordId)) && !numbers.has(normalizedValue(marker.recordNo)));
}

function loadingOrderRowMatches(loadingRow, vnnRow) {
  if (loadingRow.orderRowId && vnnRow.orderRowId && same(loadingRow.orderRowId, vnnRow.orderRowId)) return true;
  if (!loadingRow.orderNo || !same(loadingRow.orderNo, vnnRow.orderNo)) return false;
  const loadingPlant = loadingRow.plantCodeValue || loadingRow.plantName;
  const vnnPlant = vnnRow.plantCodeValue || vnnRow.plantName;
  const loadingTo = loadingRow.toName || loadingRow.to;
  const vnnTo = vnnRow.toName || vnnRow.to;
  return (!loadingPlant || !vnnPlant || same(loadingPlant, vnnPlant)) && (!loadingTo || !vnnTo || same(loadingTo, vnnTo));
}

/** Find the single approved VNN whose current order rows match this Loading Info. */
export async function findLatestApprovedVnnForLoading(record, companyId) {
  const loadingRows = record?.orderRows || [];
  if (!record?._id || !companyId || !loadingRows.length) return { required: false, candidate: null, ambiguous: false };
  const orderNos = [...new Set(loadingRows.map((row) => String(row.orderNo || '').trim()).filter(Boolean))];
  const rowIds = [...new Set(loadingRows.map((row) => String(row.orderRowId || '').trim()).filter(Boolean))];
  const filters = [
    ...(orderNos.length ? [{ 'orders.orderNo': { $in: orderNos } }] : []),
    ...(rowIds.length ? [{ 'orders.orderRowId': { $in: rowIds } }] : []),
  ];
  if (!filters.length) return { required: false, candidate: null, ambiguous: false };
  const candidates = await VehicleNegotiation.find({ companyId, $or: filters })
    .select('_id vnnNo orders approval panelStatus reapprovalState approvedRevision')
    .setOptions({ includeDeleted: false }).lean();
  const matched = candidates.filter((vnn) => {
    if (vnn.reapprovalState && vnn.reapprovalState !== 'none') return false;
    if (!['Approved', 'Completed'].includes(vnn.panelStatus || vnn.status)) return false;
    return loadingRows.every((loadingRow) => (vnn.orders || []).filter((vnnRow) => loadingOrderRowMatches(loadingRow, vnnRow)).length === 1);
  });
  if (matched.length !== 1) return { required: false, candidate: null, ambiguous: matched.length > 1 };
  const candidate = matched[0];
  const preview = structuredClone(toPlain(record));
  const sync = applyMirroredFields('vnn', candidate, preview);
  if (sync.ambiguous) return { required: false, candidate: null, ambiguous: true };
  preview.vehicleNegotiationNo = candidate.vnnNo;
  const dataChanged = normalizedObject(mirroredProjection('loading', preview)) !== normalizedObject(mirroredProjection('loading', record));
  const linkChanged = String(record.vehicleNegotiationNo || '') !== String(candidate.vnnNo || '');
  const detachedBlock = (await findDetachedLoadingOrderMarkers(record, companyId)).length > 0;
  return { required: dataChanged || linkChanged || detachedBlock, candidate, ambiguous: false };
}

/** Sync an outdated Loading Info record from its unique, currently approved VNN and queue its reapproval. */
export async function reconcileDetachedLoadingOrderMarkers(record, companyId, user = {}) {
  if (!record?._id || !companyId) return { changed: false };
  record = await LoadingPanel.findOne({ _id: record._id, companyId });
  if (!record) throw Object.assign(new Error('Loading Info record no longer exists.'), { status: 404 });
  const resolution = await findLatestApprovedVnnForLoading(record, companyId);
  if (resolution.ambiguous) throw Object.assign(new Error('More than one approved Vehicle Negotiation matches this Loading Info. Ask an admin to review the links before syncing.'), { status: 409 });
  if (!resolution.candidate) throw Object.assign(new Error('No single approved Vehicle Negotiation currently matches this Loading Info order rows. The existing blockers were kept.'), { status: 409 });

  const candidate = resolution.candidate;
  const before = storedSnapshot(record);
  const previousVnnNo = record.vehicleNegotiationNo || '';
  const sync = applyMirroredFields('vnn', candidate, record);
  if (sync.ambiguous) throw Object.assign(new Error('The VNN order rows could not be matched uniquely to Loading Info. No changes were saved.'), { status: 409 });
  record.vehicleNegotiationNo = candidate.vnnNo;

  const candidateOrders = candidate.orders || [];
  const matchesCandidateOrder = (marker) => candidateOrders.some((row) =>
    (marker.recordNo && same(marker.recordNo, row.orderNo)) || (marker.recordId && same(marker.recordId, row.orderPanelId))
  );
  record.upstreamPending = (record.upstreamPending || []).filter((marker) => {
    if (marker.panel === 'order') return !matchesCandidateOrder(marker);
    if (marker.panel === 'vnn' && previousVnnNo && same(marker.recordNo, previousVnnNo)) return false;
    return true;
  });
  record.reapprovalState = record.upstreamPending.length ? 'blockedByUpstream' : 'pendingReapproval';
  record.pendingStateBeforeBlock = '';
  record.reapprovalSyncError = '';
  record.pendingChanges = summarizeApprovedChanges('loading', before, record);
  if (previousVnnNo !== candidate.vnnNo && !record.pendingChanges.some((change) => change.field === 'Vehicle Negotiation')) {
    record.pendingChanges.push({ field: 'Vehicle Negotiation', oldValue: previousVnnNo || '—', newValue: candidate.vnnNo });
  }
  const remainingMarkerKeys = new Set((record.upstreamPending || []).map((marker) => `${marker.panel}:${marker.recordId || ''}:${marker.recordNo || ''}:${marker.batchId || ''}`));
  const removedMarkers = (before.upstreamPending || []).filter((marker) => !remainingMarkerKeys.has(`${marker.panel}:${marker.recordId || ''}:${marker.recordNo || ''}:${marker.batchId || ''}`));
  await captureSourceDependencies('loading', record, companyId);
  await record.save();
  const details = { sourceVnnNo: candidate.vnnNo, previousVnnNo, matchedRows: sync.matched, removedMarkers: removedMarkers.map((marker) => ({ panel: marker.panel, recordNo: marker.recordNo })) };
  record.reapprovalHistory.push({ action: 'syncedFromLatestVnn', actorId: user.id || null, actorName: user.name || '', at: new Date(), details });
  await record.save();
  await ReapprovalAudit.create({ companyId, panel: 'loading', recordId: record._id, recordNo: record.vehicleArrivalNo || '', action: 'syncedFromLatestVnn', actorId: user.id || null, actorName: user.name || '', before, after: storedSnapshot(record), details }).catch(() => {});
  return { changed: true, vnnNo: candidate.vnnNo, matchedRows: sync.matched, reapprovalState: record.reapprovalState };
}

/** Clear order-origin blockers from a VNN only when that order is no longer linked. */
export async function reconcileDetachedVnnOrderMarkers(record, companyId) {
  if (!record?._id || !companyId) return false;
  const detachedMarkers = findDetachedVnnOrderMarkers(record);
  if (!detachedMarkers.length) return false;

  const { ids: linkedIds, numbers: linkedNos } = linkedVnnOrderReferences(record);
  const isLinkedMarker = (marker) => linkedIds.has(asString(marker.recordId)) || linkedNos.has(normalizedValue(marker.recordNo));

  const upstreamPending = record.upstreamPending.filter((marker) => !(marker.panel === 'order' && !isLinkedMarker(marker)));
  const sourceDependencies = (record.sourceDependencies || []).filter((dependency) =>
    dependency.panel !== 'order' || linkedIds.has(asString(dependency.recordId)) || linkedNos.has(normalizedValue(dependency.recordNo))
  );
  const previousState = record.pendingStateBeforeBlock || detachedMarkers[detachedMarkers.length - 1]?.previousState || 'none';
  const reapprovalState = record.reapprovalState === 'blockedByUpstream' && !upstreamPending.length
    ? (previousState === 'blockedByUpstream' ? 'none' : previousState)
    : record.reapprovalState;
  const reapprovalSyncError = !upstreamPending.length && /linked rows could not be matched uniquely/i.test(record.reapprovalSyncError || '')
    ? ''
    : (record.reapprovalSyncError || '');
  const historyEntry = { action: 'detachedOrderBlockCleared', actorName: 'System', at: new Date(), sourcePanel: 'order', details: { removedMarkers: detachedMarkers.map((marker) => ({ recordId: marker.recordId, recordNo: marker.recordNo })) } };

  await VehicleNegotiation.updateOne({ _id: record._id, companyId }, { $set: {
    upstreamPending,
    sourceDependencies,
    reapprovalState,
    pendingStateBeforeBlock: upstreamPending.length ? record.pendingStateBeforeBlock : '',
    reapprovalSyncError,
  }, $push: { reapprovalHistory: historyEntry } }, { runValidators: false });
  record.upstreamPending = upstreamPending;
  record.sourceDependencies = sourceDependencies;
  record.reapprovalState = reapprovalState;
  record.pendingStateBeforeBlock = upstreamPending.length ? record.pendingStateBeforeBlock : '';
  record.reapprovalSyncError = reapprovalSyncError;
  record.reapprovalHistory = [...(record.reapprovalHistory || []), historyEntry];
  await ReapprovalAudit.create({
    companyId, panel: 'vnn', recordId: record._id, recordNo: record.vnnNo || '',
    action: 'detachedOrderBlockCleared', actorName: 'System',
    details: { removedMarkers: detachedMarkers.map((marker) => ({ recordId: marker.recordId, recordNo: marker.recordNo })), remainingBlockers: upstreamPending.length, restoredState: reapprovalState },
  }).catch(() => {});
  return true;
}

const normalizedValue = (value) => asString(value).toLocaleLowerCase();

/** Reject approval when any stored source revision is stale or currently under correction. */
export async function assertSourcesCurrent(doc, companyId) {
  const dependencies = (doc.sourceDependencies || []).filter((dependency) => !(doc.lrNo && dependency.panel === 'loading'));
  for (const dependency of dependencies) {
    const Model = SOURCE_MODELS[dependency.panel];
    if (!Model) throw Object.assign(new Error(`Approval is blocked: unsupported upstream panel ${dependency.panel}.`), { status: 409 });
    const source = await Model.findOne({ _id: dependency.recordId, companyId }).select('reapprovalState approvedRevision rateApproval.approvedRevision').lean();
    if (!source) throw Object.assign(new Error(`Approval is blocked: linked ${dependency.panel} record no longer exists.`), { status: 409 });
    if (source.reapprovalState && source.reapprovalState !== 'none') throw Object.assign(new Error(`Approval is blocked while the linked ${dependency.panel} record is ${source.reapprovalState}.`), { status: 409 });
    if (approvedRevisionFor(dependency.panel, source) !== (Number(dependency.revision) || 0)) throw Object.assign(new Error(`Approval is blocked because linked ${dependency.panel} data changed. Refresh and review the latest version.`), { status: 409 });
  }
  return true;
}

function applyMirroredFields(type, source, child) {
  if (type === 'order') {
    const rows = source.plantRows || [];
    let matched = 0;
    for (const target of child.orders || []) {
      let row = target.orderRowId ? rows.find((candidate) => same(candidate._id, target.orderRowId)) : null;
      if (!row) {
        const candidates = rows.filter((candidate) => same(target.orderNo, source.orderPanelNo) && same(target.plantCodeValue || target.plantName, candidate.plantCodeValue || candidate.plantName) && same(target.toName, candidate.toName));
        if (candidates.length === 1) row = candidates[0];
      }
      if (!row) continue;
      copyOrderRow(row, target);
      matched++;
    }
    return { matched, ambiguous: (child.orders || []).length > matched };
  }
  if (type === 'vnn') {
    if (!Array.isArray(child.orderRows)) {
      const header = child.header?.toObject?.() || child.header || {};
      let sourceRow = child.orderRowId
        ? (source.orders || []).find((row) => same(row.orderRowId, child.orderRowId))
        : null;
      if (!sourceRow) {
        const candidates = (source.orders || []).filter((row) =>
          (!header.orderNo || same(row.orderNo, header.orderNo)) &&
          (!header.plantCode || same(row.plantCodeValue || row.plantName || row.plantCode, header.plantCode)) &&
          (!header.to || same(row.toName || row.to, header.to))
        );
        if (candidates.length === 1) sourceRow = candidates[0];
      }
      if (!sourceRow) return { matched: 0, ambiguous: true };
      const rowFields = {
        orderNo: sourceRow.orderNo,
        partyName: sourceRow.partyName || source.customerName || source.partyName,
        orderType: sourceRow.orderType,
        plantCode: sourceRow.plantCodeValue || sourceRow.plantName || sourceRow.plantCode?.code || sourceRow.plantCode,
        plantName: sourceRow.plantName,
        from: sourceRow.fromName || sourceRow.from,
        fromState: sourceRow.fromState,
        to: sourceRow.toName || sourceRow.to,
        taluka: sourceRow.talukaName || sourceRow.taluka,
        district: sourceRow.districtName || sourceRow.district,
        state: sourceRow.stateName || sourceRow.state,
      };
      for (const [field, value] of Object.entries(rowFields)) if (value !== undefined) header[field] = value;
      if (source.approval?.vendorCode !== undefined) header.vendorCode = source.approval.vendorCode;
      if (source.approval?.vendorName !== undefined) header.vendorName = source.approval.vendorName;
      if (source.approval?.vehicleNo !== undefined) header.vehicleNo = source.approval.vehicleNo;
      if (source.approval?.mobile !== undefined) header.partyNo = source.approval.mobile;
      child.header = header;
      child.vnnNo = source.vnnNo || child.vnnNo;
      if (source._id) child.vehicleNegotiationRef = source._id;
      if (!child.orderRowId && sourceRow.orderRowId) child.orderRowId = sourceRow.orderRowId;
      child.consignmentBreakdown = [{
        orderNo: sourceRow.orderNo || header.orderNo || '',
        from: sourceRow.fromName || sourceRow.from || '',
        to: sourceRow.toName || sourceRow.to || '',
        weight: Number(sourceRow.weight) || 0,
        unit: 'MT',
      }];
      return { matched: 1, ambiguous: false };
    }
    let matched = 0;
    for (const target of child.orderRows || []) {
      let row = target.orderRowId ? (source.orders || []).find((candidate) => same(candidate.orderRowId, target.orderRowId)) : null;
      if (!row && target.orderNo) {
        const candidates = (source.orders || []).filter((candidate) => same(candidate.orderNo, target.orderNo) && same(candidate.plantCodeValue || candidate.plantName, target.plantCodeValue || target.plantName) && same(candidate.toName, target.toName));
        if (candidates.length === 1) row = candidates[0];
      }
      if (!row) continue;
      copyOrderRow(row, target);
      matched++;
    }
    // These three values are copied from the approved VNN selection to Loading Info.
    if (source.approval?.vehicleNo) child.vehicleInfo = { ...(child.vehicleInfo?.toObject?.() || child.vehicleInfo || {}), vehicleNo: source.approval.vehicleNo };
    if (source.approval?.mobile) child.vehicleInfo = { ...(child.vehicleInfo?.toObject?.() || child.vehicleInfo || {}), driverMobileNo: source.approval.mobile };
    if (source.approval?.vendorName) child.vehicleInfo = { ...(child.vehicleInfo?.toObject?.() || child.vehicleInfo || {}), vehicleOwnerName: source.approval.vendorName };
    return { matched, ambiguous: (child.orderRows || []).length > matched };
  }
  if (type === 'loading') {
    const candidates = (source.orderRows || []).filter((row) => !child.orderRowId || same(row.orderRowId, child.orderRowId));
    if (candidates.length !== 1) return { matched: 0, ambiguous: true };
    const row = candidates[0];
    const header = child.header?.toObject?.() || child.header || {};
    for (const [from, to] of Object.entries({ orderNo: 'orderNo', partyName: 'partyName', orderType: 'orderType', plantCodeValue: 'plantCode', plantName: 'plantName', fromName: 'from', fromState: 'fromState', toName: 'to', talukaName: 'taluka', districtName: 'district', stateName: 'state' })) {
      if (row[from] !== undefined) header[to] = row[from];
    }
    child.header = header;
    if (Number.isFinite(Number(row.weight)) && Number(row.weight) > 0) {
      child.consignmentBreakdown = [{ orderNo: row.orderNo || '', from: row.fromName || '', to: row.toName || '', weight: Number(row.weight), unit: 'MT' }];
    }
    return { matched: 1, ambiguous: false };
  }
  return { matched: 0, ambiguous: true };
}

const changeFieldLabels = {
  branch: 'Branch ID', branchName: 'Branch', branchCode: 'Branch code', date: 'Date',
  customerName: 'Customer', partyName: 'Party', customerId: 'Customer ID', delivery: 'Delivery',
  subCompanyId: 'Sub-company ID', subCompanyName: 'Sub-company', subCompanyCode: 'Sub-company code',
  billingType: 'Billing type', loadingPoints: 'Loading points', dropPoints: 'Drop points',
  collectionCharges: 'Collection charges', cancellationCharges: 'Cancellation charges',
  loadingCharges: 'Loading charges', otherCharges: 'Other charges', vehicleNo: 'Vehicle number',
  vendorName: 'Vendor', mobile: 'Mobile', orderNo: 'Order number', plantCode: 'Plant ID',
  plantCodeValue: 'Plant code', plantName: 'Plant', orderType: 'Order type', pinCode: 'PIN code',
  countryName: 'Country', stateName: 'State', districtName: 'District', talukaName: 'Taluka',
  fromName: 'From', fromState: 'Origin state', toName: 'To', weight: 'Weight',
  locationRemark: 'Location remark', localStatusLabel: 'Local status',
  packData: 'Packs', PALLETIZATION: 'Pallets', 'UNIFORM - BAGS/BOXES': 'Bags / boxes',
  'LOOSE - CARGO': 'Loose cargo', 'NON-UNIFORM - GENERAL CARGO': 'General cargo',
  orders: 'Order', orderRows: 'Order', plantRows: 'Plant', consignmentBreakdown: 'Consignment',
  totalPkgs: 'Packages', noOfPallets: 'Pallets', unitPerPallets: 'Packages per pallet',
  pkgsType: 'Package type', skuSize: 'SKU size', packWeight: 'Weight per package',
  actualWt: 'Actual weight', chargedWt: 'Charged weight', wtUom: 'Weight unit',
  productName: 'Product', totalWeight: 'Total weight', uom: 'Unit', wtLtr: 'Weight / litre',
};
const reviewExcludedFields = new Set([
  '__v', 'companyId', 'createdBy', 'createdAt', 'updatedAt',
  'isDeleted', 'deletedAt', 'deletedBy', 'deleteReason', 'deleteBatchId', 'deleteRootType', 'deleteRootNo', 'statusBeforeDelete',
  'plantRowId', 'reportRows',
  'approvedRevision', 'approvedSnapshot', 'reapprovalState', 'unlockedBy', 'unlockedAt', 'unlockReason',
  'sourceDependencies', 'upstreamPending', 'pendingChanges', 'pendingStateBeforeBlock', 'reapprovalHistory', 'reapprovalSyncError',
  'panelStatus', 'status', 'approvalStatus', 'workflowPhase', 'approvalRevision', 'submittedRevision',
  'part1Status', 'part3Status', 'part1Remarks', 'part3Remarks', 'workflow', 'approvalHistory',
]);

function reviewProjection(value) {
  const plain = value?.toObject ? value.toObject({ depopulate: true }) : (value || {});
  const clean = (item, isRoot = false) => {
    if (item?._bsontype === 'ObjectId') return String(item);
    if (item instanceof Date) return item;
    if (Array.isArray(item)) return item.map((nested) => clean(nested));
    if (item && typeof item === 'object') {
      return Object.fromEntries(Object.entries(item)
        .filter(([key]) => !(isRoot && key === '_id') && !reviewExcludedFields.has(key))
        .map(([key, nested]) => [key, clean(nested)]));
    }
    return item;
  };
  return clean(plain, true);
}

function changeRowLabel(row, index) {
  const plant = row?.plantCodeValue || row?.plantName;
  const destination = row?.toName || row?.to;
  if (plant && destination) return `${plant} → ${destination}`;
  return String(plant || row?.orderNo || row?.productName || row?.lrNo || `Row ${index + 1}`);
}

function comparableValue(value) {
  if (value?._bsontype === 'ObjectId') return String(value);
  if (value instanceof Date) return value.toISOString();
  return value;
}

function reviewRowSummary(row) {
  const parts = [];
  if (row.productName) parts.push(row.productName);
  if (row.totalPkgs !== undefined && row.totalPkgs !== '') parts.push(`${row.totalPkgs} packages`);
  if (row.noOfPallets) parts.push(`${row.noOfPallets} pallets`);
  if (row.actualWt !== undefined && row.actualWt !== '') parts.push(`Actual weight: ${row.actualWt}${row.wtUom || row.uom ? ` ${row.wtUom || row.uom}` : ''}`);
  if (row.chargedWt !== undefined && row.chargedWt !== '') parts.push(`Charged weight: ${row.chargedWt}${row.wtUom || row.uom ? ` ${row.wtUom || row.uom}` : ''}`);
  if (row.orderNo) parts.push(row.orderNo);
  if (row.from || row.to) parts.push(`${row.from || '—'} → ${row.to || '—'}`);
  if (row.weight !== undefined) parts.push(`${row.weight}${row.unit ? ` ${row.unit}` : ''}`);
  return parts.join('; ') || Object.entries(row).filter(([key, value]) => !['_id', 'id', 'packType'].includes(key) && value !== '' && value != null).map(([key, value]) => `${changeFieldLabels[key] || key}: ${value}`).join('; ') || 'Empty row';
}

function reviewRowIdentity(row, index) {
  if (row.orderRowId) return `drop:${row.orderRowId}`;
  if (row.productName) return `product:${String(row.productName).trim().toLowerCase()}`;
  if (row.orderNo) return `order:${row.orderNo}:${row.fromName || row.from || ''}:${row.toName || row.to || ''}`;
  return `row:${changeRowLabel(row, index)}`;
}

function valueDiff(before, after, path = '') {
  const oldValue = comparableValue(before);
  const newValue = comparableValue(after);
  // Missing optional strings and saved empty defaults display identically.
  if ([null, undefined, ''].includes(oldValue) && [null, undefined, ''].includes(newValue)) return [];
  if ((typeof oldValue === 'number' || typeof newValue === 'number') && oldValue !== '' && newValue !== '' && oldValue != null && newValue != null && Number(oldValue) === Number(newValue)) return [];
  if (normalizedObject(oldValue) === normalizedObject(newValue)) return [];
  if (Array.isArray(oldValue) || Array.isArray(newValue)) {
    const isPack = path.startsWith('packData.');
    const meaningful = (row) => !isPack || Boolean(row.productName || ['totalPkgs', 'noOfPallets', 'actualWt', 'chargedWt', 'nos', 'length', 'width', 'height'].some((key) => Number(row[key]) !== 0 && Number.isFinite(Number(row[key]))));
    const oldRows = (Array.isArray(oldValue) ? oldValue : []).filter(meaningful);
    const newRows = (Array.isArray(newValue) ? newValue : []).filter(meaningful);
    const unmatched = new Set(newRows.map((_row, index) => index));
    const withoutIds = (row) => Object.fromEntries(Object.entries(row).filter(([key]) => !['_id', 'id', 'packType'].includes(key)));
    const matches = new Map();
    // Reserve unchanged duplicates before matching edited rows by product name.
    for (const exactId of [true, false]) for (const [index, row] of oldRows.entries()) {
      if (matches.has(index)) continue;
      const match = [...unmatched].find((next) => exactId
        ? row._id && String(row._id) === String(newRows[next]._id)
        : normalizedObject(withoutIds(row)) === normalizedObject(withoutIds(newRows[next])));
      if (match !== undefined) { matches.set(index, match); unmatched.delete(match); }
    }
    const result = [];
    for (const [index, row] of oldRows.entries()) {
      let match = matches.get(index);
      if (match === undefined) match = [...unmatched].find((next) => reviewRowIdentity(row, index) === reviewRowIdentity(newRows[next], next));
      const rowPath = `${path}[${changeRowLabel(row, index)}]`;
      if (match === undefined) result.push({ field: rowPath, action: 'removed', oldValue: reviewRowSummary(row), newValue: null });
      else {
        unmatched.delete(match);
        result.push(...valueDiff(row, newRows[match], rowPath));
      }
    }
    for (const index of unmatched) result.push({ field: `${path}[${changeRowLabel(newRows[index], index)}]`, action: 'added', oldValue: null, newValue: reviewRowSummary(newRows[index]) });
    return result;
  }
  const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !value._bsontype;
  if (isPlainObject(oldValue) || isPlainObject(newValue)) {
    const oldObject = isPlainObject(oldValue) ? oldValue : {};
    const newObject = isPlainObject(newValue) ? newValue : {};
    const result = [];
    for (const key of new Set([...Object.keys(oldObject), ...Object.keys(newObject)])) {
      if (['_id', 'id', 'packType'].includes(key)) continue;
      result.push(...valueDiff(oldObject[key], newObject[key], path ? `${path}.${key}` : key));
    }
    return result;
  }
  return [{ field: path, oldValue: oldValue ?? null, newValue: newValue ?? null }];
}

export function summarizeApprovedChanges(type, before, after) {
  const changes = valueDiff(reviewProjection(before), reviewProjection(after));
  return changes.map((change) => ({ ...change, field: change.field
    .split(/\.(?![^\[]*\])/)
    .map((part) => {
      const [, key, row] = part.match(/^([^\[]+)(?:\[(.*)\])?$/) || [];
      const label = changeFieldLabels[key] || (key || part).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());
      return row ? `${label} · ${row}` : label;
    })
    .join(' · '),
  }));
}

/** Read the approved Order-owned remarks for a VNN review, including legacy
 * records synced before locationRemark was included in the row copier. */
export async function withApprovedVnnLocationRemarks(record, user) {
  const rows = record.orders || [];
  const ids = [...new Set(rows.map((row) => String(row.orderPanelId || '')).filter(mongoose.isValidObjectId))];
  const numbers = [...new Set(rows.map((row) => row.orderNo).filter(Boolean))];
  const filters = [...(ids.length ? [{ _id: { $in: ids } }] : []), ...(numbers.length ? [{ orderPanelNo: { $in: numbers } }] : [])];
  if (!filters.length) return record;
  const orders = await OrderPanel.find(companyScopeFilter(user, { $or: filters }))
    .select('orderPanelNo plantRows panelStatus reapprovalState approvedSnapshot.plantRows').lean();
  return applyApprovedVnnLocationRemarks(record, orders);
}

export function applyApprovedVnnLocationRemarks(record, orders) {
  const rows = record.orders || [];
  const byId = new Map(orders.map((order) => [String(order._id), order]));
  const byNo = new Map(orders.map((order) => [String(order.orderPanelNo), order]));
  return { ...record, orders: rows.map((row) => {
    const order = byId.get(String(row.orderPanelId || '')) || byNo.get(String(row.orderNo || ''));
    const approvedRows = order?.reapprovalState && order.reapprovalState !== 'none'
      ? order.approvedSnapshot?.plantRows || []
      : ['Approved', 'Completed', 'Partially on hold'].includes(order?.panelStatus) ? order.plantRows || [] : [];
    const candidates = approvedRows.filter((candidate) => row.orderRowId
      ? same(candidate._id, row.orderRowId)
      : same(candidate.plantCodeValue || candidate.plantName, row.plantCodeValue || row.plantName) && same(candidate.toName, row.toName));
    if (candidates.length !== 1 || candidates[0].locationRemark === undefined) return row;
    return { ...row, locationRemark: candidates[0].locationRemark };
  }) };
}

/** Update one hop only after its source is approved; a later approval advances the next hop. */
export async function recordApprovedRevision(type, recordId, user) {
  const source = SOURCES[type];
  if (!source || !mongoose.isValidObjectId(recordId)) return { propagated: 0, changed: false };
  const session = await mongoose.startSession();
  const noticeList = [];
  let result = { propagated: 0, changed: false, revision: 0 };
  try {
    await session.withTransaction(async () => {
      const doc = await source.Model.findOne({ _id: recordId, companyId: user.companyId }).session(session);
      if (!doc) throw new Error(`${source.label} disappeared before revision sync.`);
      const currentProjection = mirroredProjection(type, doc);
      const oldSnapshot = doc.approvedSnapshot;
      const oldProjection = oldSnapshot ? mirroredProjection(type, oldSnapshot) : null;
      const changed = !!oldProjection && normalizedObject(currentProjection) !== normalizedObject(oldProjection);
      const wasReapproval = ['unlocked', 'pendingApproval', 'pendingReapproval', 'syncFailed'].includes(doc.reapprovalState);
      // A panel that is now being reapproved has already cleared its upstream
      // blockers. Carry those unlock batches forward so descendants do not keep
      // displaying an earlier panel (for example Order Panel) as the blocker
      // after this panel (for example VNN) has completed its review.
      const resolvedUpstreamBatchIds = new Set((doc.upstreamPending || [])
        .map((marker) => String(marker.batchId || ''))
        .filter(Boolean));
      if (wasReapproval) doc.upstreamPending = [];
      const revision = type === 'pricing'
        ? approvedRevisionFor(type, doc)
        : Math.max(0, Number(doc.approvedRevision) || 0) + (wasReapproval ? 1 : (doc.approvedRevision ? 0 : 1));
      const before = oldSnapshot || null;
      doc.approvedRevision = revision;
      doc.approvedSnapshot = storedSnapshot(doc);
      doc.reapprovalState = 'none';
      doc.reapprovalSyncError = '';
      doc.unlockedBy = null;
      doc.unlockedAt = null;
      doc.unlockReason = '';
      doc.reapprovalHistory.push({ action: wasReapproval ? 'reapproved' : 'initialApproval', actorId: user.id, actorName: user.name || '', at: new Date(), revision, changed });

      if (wasReapproval && changed) {
        const children = await findDirectChildren(type, doc, session);
        // VNN carries order revision references rather than pack tables. An order
        // revision must still propagate when its plant rows have not changed.
        const orderRevisionsChanged = type === 'vnn'
          && normalizedObject(orderSourceRevisions(doc)) !== normalizedObject(orderSourceRevisions(oldSnapshot));
        let packOrders = [];
        if (orderRevisionsChanged) {
          const references = linkedVnnOrderReferences(doc);
          const orderIds = [...references.ids].filter(mongoose.isValidObjectId);
          const orderNos = [...new Set((doc.orders || []).map((row) => row.orderNo).filter(Boolean))];
          const filters = [...(orderIds.length ? [{ _id: { $in: orderIds } }] : []), ...(orderNos.length ? [{ orderPanelNo: { $in: orderNos } }] : [])];
          if (filters.length) packOrders = await OrderPanel.find({ companyId: doc.companyId, $or: filters }).session(session);
        }
        for (const childEntry of children) {
          const childType = childEntry.type;
          const child = childEntry.record;
          const target = TARGETS[childType];
          const beforeChild = storedSnapshot(child);
          const mapResult = childType === 'pricing'
            ? syncPricingFromVnn(doc, oldSnapshot, child)
            : applyMirroredFields(type, doc, child);
          if (orderRevisionsChanged && ['loading', 'lr'].includes(childType)) {
            const packs = syncPacksFromOrders(packOrders, child);
            mapResult.ambiguous = mapResult.ambiguous || packs.ambiguous;
          }
          if (childType === 'lr') child.consignmentBreakdown = withLrCargoWeight(child.consignmentBreakdown || [], child);
          const refreshedDependencies = [...new Map([
            ...(child.sourceDependencies || [])
              .filter((dependency) => dependency.panel === type && same(dependency.recordId, doc._id))
              .map((dependency) => ({ ...toPlain(dependency), revision })),
            ...(doc.sourceDependencies || []),
            { panel: type, recordId: String(doc._id), recordNo: doc[source.number], rowId: '', revision },
          ].map((dependency) => [`${dependency.panel}:${String(dependency.recordId)}:${String(dependency.rowId || '')}`, dependency])).values()];
          const resolvedSources = new Set(refreshedDependencies.map((dep) => `${dep.panel}:${String(dep.recordId)}`));
          const remainingBlocks = (child.upstreamPending || []).filter((marker) =>
            !(marker.batchId && resolvedUpstreamBatchIds.has(String(marker.batchId))) &&
            !resolvedSources.has(`${marker.panel}:${String(marker.recordId)}`)
          );
          if (mapResult.ambiguous) remainingBlocks.push({ panel: type, recordId: String(doc._id), recordNo: doc[source.number], revision, reason: 'Dependency link needs review' });
          if (childType === 'pricing' && !mapResult.affected) {
            child.upstreamPending = remainingBlocks;
            child.reapprovalState = remainingBlocks.length ? 'blockedByUpstream' : (child.reapprovalState === 'blockedByUpstream' ? (child.pendingStateBeforeBlock || 'none') : child.reapprovalState);
            child.sourceDependencies = (child.sourceDependencies || []).filter((dep) => !resolvedSources.has(`${dep.panel}:${String(dep.recordId)}`));
            child.sourceDependencies.push(...refreshedDependencies);
            if (!remainingBlocks.length) child.pendingStateBeforeBlock = '';
            await child.save({ session });
            continue;
          }
          child.upstreamPending = remainingBlocks;
          child.reapprovalState = remainingBlocks.length ? 'blockedByUpstream' : 'pendingReapproval';
          if (!remainingBlocks.length) child.pendingStateBeforeBlock = '';
          child.pendingChanges = summarizeApprovedChanges(childType, beforeChild, child);
          if (childType === 'pricing' && mapResult.needsRateReview) child.pendingChanges.push({ field: 'Rate review required', oldValue: 'Current saved rate', newValue: 'Review rate and total after route or weight change' });
          if (childType === 'pricing') {
            child.rateApproval = child.rateApproval || {};
            child.isDraft = false;
            child.panelStatus = 'Submitted';
            child.rateApproval.approvalStatus = 'Pending';
            child.rateApproval.workflowPhase = 'part1';
            child.rateApproval.submittedRevision = 0;
            child.rateApproval.approvalRevision = (Number(child.rateApproval.approvalRevision) || 0) + 1;
            child.rateApproval.approvalHistory = child.rateApproval.approvalHistory || [];
            child.rateApproval.approvalHistory.push({ revision: child.rateApproval.approvalRevision, action: 'changed', userId: user.id, remarks: `Upstream Vehicle Negotiation ${doc.vnnNo} changed; Pricing review is required.`, createdAt: new Date() });
          }
          child.sourceDependencies = (child.sourceDependencies || []).filter((dep) => !resolvedSources.has(`${dep.panel}:${String(dep.recordId)}`));
          child.sourceDependencies.push(...refreshedDependencies);
          child.reapprovalSyncError = mapResult.ambiguous ? 'Some linked rows could not be matched uniquely. Review the dependency before approval.' : '';
          child.reapprovalHistory.push({ action: mapResult.ambiguous ? 'syncNeedsReview' : 'syncedForReapproval', actorId: user.id, actorName: user.name || '', at: new Date(), sourcePanel: type, sourceRecordId: String(doc._id), sourceRevision: revision, matchedRows: mapResult.matched });
          await child.save({ session });
          await ReapprovalAudit.create([{
            companyId: doc.companyId, panel: childType, recordId: child._id, recordNo: child[target.number] || '',
            action: mapResult.ambiguous ? 'syncNeedsReview' : 'downstreamSynced', actorId: user.id, actorName: user.name || '', revision,
            before: beforeChild, after: storedSnapshot(child), details: { sourcePanel: type, sourceRecordId: String(doc._id), sourceRevision: revision, matchedRows: mapResult.matched },
          }], { session });
          noticeList.push({ childType, id: String(child._id), no: String(child.vnnNo || child.pricingSerialNo || child.vehicleArrivalNo || child.lrNo || '') });
        }
      } else if (wasReapproval && !changed) {
        const unlockBatch = [...(doc.reapprovalHistory || [])].reverse().find((entry) => entry.action === 'unlocked')?.batchId;
        const batchesToResolve = new Set([...resolvedUpstreamBatchIds, ...(unlockBatch ? [String(unlockBatch)] : [])]);
        if (batchesToResolve.size) {
          for (const childType of ['vnn', 'pricing', 'loading', 'lr']) {
            const Model = TARGETS[childType].Model;
            const children = await Model.find({ companyId: doc.companyId, upstreamPending: { $elemMatch: { batchId: { $in: [...batchesToResolve] } } } }).session(session);
            for (const child of children) {
              const marker = (child.upstreamPending || []).find((entry) => batchesToResolve.has(String(entry.batchId || '')));
              child.upstreamPending = (child.upstreamPending || []).filter((entry) => !batchesToResolve.has(String(entry.batchId || '')));
              child.reapprovalState = child.upstreamPending.length ? 'blockedByUpstream' : (marker?.previousState || child.pendingStateBeforeBlock || 'none');
              if (!child.upstreamPending.length) child.pendingStateBeforeBlock = '';
              await child.save({ session });
            }
          }
        }
      }

      await doc.save({ session });
      await ReapprovalAudit.create([{
        companyId: doc.companyId, panel: type, recordId: doc._id, recordNo: doc[source.number] || '',
        action: wasReapproval ? 'reapproved' : 'initialApproval', actorId: user.id, actorName: user.name || '', revision,
        before, after: doc.approvedSnapshot, details: { changed, propagatedCount: noticeList.length },
      }], { session });
      result = { propagated: noticeList.length, changed, revision };
    });
  } catch (error) {
    // The upstream approval is retained, but downstream approval remains blocked until an admin retries.
    await source.Model.updateOne({ _id: recordId, companyId: user.companyId }, { $set: { reapprovalState: 'syncFailed', reapprovalSyncError: error.message } }, { runValidators: false }).catch(() => {});
    await ReapprovalAudit.create({ companyId: user.companyId, panel: type, recordId, action: 'syncFailed', actorId: user.id, actorName: user.name || '', details: { error: error.message } }).catch(() => {});
    throw error;
  } finally {
    await session.endSession();
  }

  for (const item of noticeList) {
    const target = TARGETS[item.childType];
    const msg = `${target.module} ${item.no} has saved upstream changes and needs review before approval.`;
    const url = `/admin/${target.path}/${item.id}`;
    await Promise.all([
      notifyModulePermissionUsers({ user, module: target.module, action: 'edit', type: 'pending-reapproval', message: msg, pushTitle: 'Downstream update needs review', pushBody: msg, url }),
      notifyModulePermissionUsers({ user, module: item.childType === 'pricing' ? 'Pricing Panel - Part 2 Approval' : target.module, action: 'approve', type: 'pending-reapproval-approval', message: msg, pushTitle: 'Record pending reapproval', pushBody: msg, url }),
    ]);
  }
  return result;
}
