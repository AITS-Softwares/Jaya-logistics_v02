import OrderPanel from '@/app/api/order-panel/OrderPanel';
import PurchasePanel from '@/app/api/purchase-panel/PurchasePanel';
import AdvancePayment from '@/app/api/Advance-Payment/AdvancePayment';
import VehicleNegotiation from '@/app/api/vehicle-negotiation/VehicleNegotiation';
import PricingPanel from '@/app/api/pricing-panel/PricingPanel';
import LoadingPanel from '@/app/api/loading-panel/LoadingPanel';
import ConsignmentNote from '@/app/api/consignment-note/ConsignmentNote';
import POD from '@/app/api/pod-panel/POD';
import BalancePayment from '@/app/api/balance-payment/BalancePayment';
import { getBilledLrNumbers } from '@/lib/billedLrs';

export const TYPES = {
  order: { Model: OrderPanel, no: 'orderPanelNo', label: 'Order' },
  purchase: { Model: PurchasePanel, no: 'purchaseNo', label: 'Purchase' },
  advance: { Model: AdvancePayment, no: 'paymentNo', label: 'Advance Payment' },
  vnn: { Model: VehicleNegotiation, no: 'vnnNo', label: 'Vehicle Negotiation' },
  pricing: { Model: PricingPanel, no: 'pricingSerialNo', label: 'Pricing' },
  loading: { Model: LoadingPanel, no: 'vehicleArrivalNo', label: 'Loading Info' },
  lr: { Model: ConsignmentNote, no: 'lrNo', label: 'LR' },
  pod: { Model: POD, no: 'podNo', label: 'POD' },
  balance: { Model: BalancePayment, no: 'balancePaymentNo', label: 'Balance Payment' },
};

const id = (x) => String(x?._id || x || '');
const no = (x) => String(x || '').trim();
const same = (left, right) => String(left ?? '').trim().toLowerCase() === String(right ?? '').trim().toLowerCase();
const active = (query, session) => query.session(session).setOptions({ includeDeleted: false }).lean();

function orderRowFallbackMatches(sourceRow, linkedRow) {
  const sourcePlant = sourceRow.plantCodeValue || sourceRow.plantName || sourceRow.plantCode;
  const linkedPlant = linkedRow.plantCode || linkedRow.plantName || linkedRow.plantCodeValue;
  const plantMatches = !sourcePlant || !linkedPlant || same(sourcePlant, linkedPlant);
  const fromMatches = (!sourceRow.fromName && !linkedRow.fromName) || same(sourceRow.fromName || sourceRow.from, linkedRow.fromName || linkedRow.from);
  const toMatches = (!sourceRow.toName && !linkedRow.toName) || same(sourceRow.toName || sourceRow.to, linkedRow.toName || linkedRow.to);
  return plantMatches && fromMatches && toMatches;
}

function matchesOrderRow(linkedRow, order, orderNo, rowIds) {
  if (String(linkedRow.orderPanelId || '') === String(order._id) || rowIds.includes(String(linkedRow.orderRowId || ''))) return true;
  if (linkedRow.orderNo === orderNo) return true;
  if (linkedRow.orderNo && linkedRow.orderNo !== orderNo) return false;
  const candidates = (order.plantRows || []).filter((sourceRow) =>
    (!linkedRow.plantName && !linkedRow.plantCodeValue || same(sourceRow.plantName || sourceRow.plantCodeValue || sourceRow.plantCode, linkedRow.plantName || linkedRow.plantCodeValue)) &&
    (!linkedRow.toName && !linkedRow.to || same(sourceRow.toName || sourceRow.to, linkedRow.toName || linkedRow.to))
  );
  return candidates.length === 1 && orderRowFallbackMatches(candidates[0], linkedRow);
}

async function childrenOf(type, doc, companyId, session) {
  const eq = (field, value) => value ? { [field]: value } : null;
  const query = (Model, filter) => filter ? active(Model.find({ companyId, ...filter }), session) : Promise.resolve([]);
  const orders = no(doc.orderPanelNo || doc.header?.orderNo);
  switch (type) {
    case 'order': {
      const rowIds = (doc.plantRows || []).map((r) => id(r._id)).filter(Boolean);
      const [purchases, vnns, loadings, lrs] = await Promise.all([
        query(PurchasePanel, { 'orderRows.orderNo': orders }),
        query(VehicleNegotiation, { $or: [
          { 'orders.orderNo': orders }, { 'orders.orderPanelId': String(doc._id) }, { 'orders.orderRowId': { $in: rowIds } },
        ] }),
        query(LoadingPanel, { $or: [
          { 'orderRows.orderNo': orders }, { 'orderRows.orderPanelId': String(doc._id) }, { 'orderRows.orderRowId': { $in: rowIds } },
        ] }),
        query(ConsignmentNote, { $or: [eq('header.orderNo', orders), ...(rowIds.length ? [{ orderRowId: { $in: rowIds } }] : [])] }),
      ]);
      const relatedPurchases = purchases.filter((purchase) => (purchase.orderRows || []).some((row) =>
        row.orderNo === orders && (rowIds.includes(String(row.orderRowId || row.sourceRowId || row._id)) || (doc.plantRows || []).some((sourceRow) => orderRowFallbackMatches(sourceRow, row)))
      ));
      const relatedVnns = vnns.filter((vnn) => (vnn.orders || []).some((row) => matchesOrderRow(row, doc, orders, rowIds)));
      const relatedLoadings = loadings.filter((panel) => (panel.orderRows || []).some((row) => matchesOrderRow(row, doc, orders, rowIds)));
      const relatedLrs = lrs.filter((lr) => {
        if (lr.orderRowId) return rowIds.includes(String(lr.orderRowId));
        const linkedLoading = relatedLoadings.some((panel) => panel.vehicleArrivalNo === lr.loadingInfoNo);
        if (linkedLoading) return true;
        return (doc.plantRows || []).some((row) => {
          const destinationMatches = !lr.header?.to || same(lr.header.to, row.toName || row.to);
          const plantMatches = !lr.header?.plantCode || same(lr.header.plantCode, row.plantCodeValue || row.plantName || row.plantCode);
          return destinationMatches && plantMatches && (!lr.header?.orderNo || lr.header.orderNo === orders);
        });
      });
      return [['purchase', relatedPurchases], ['vnn', relatedVnns], ['loading', relatedLoadings], ['lr', relatedLrs]];
    }
    case 'purchase': {
      const [advances] = await Promise.all([query(AdvancePayment, { purchaseNo: no(doc.purchaseNo) })]);
      return [['advance', advances]];
    }
    case 'vnn': {
      const [pricings, loadings] = await Promise.all([
        query(PricingPanel, { $or: [
          { 'orders.vehicleNegotiationId': doc._id },
          { 'orders.vehicleNegotiationId': String(doc._id) },
          { vnnNo: no(doc.vnnNo) },
        ] }),
        query(LoadingPanel, { vehicleNegotiationNo: no(doc.vnnNo) }),
      ]);
      return [['pricing', pricings], ['loading', loadings]];
    }
    case 'loading': {
      const [lrs] = await Promise.all([query(ConsignmentNote, { loadingInfoNo: no(doc.vehicleArrivalNo) })]);
      return [['lr', lrs]];
    }
    case 'lr': {
      const lrNo = no(doc.lrNo);
      const [pods, balances] = await Promise.all([
        query(POD, { 'lrEntries.lrNo': lrNo }),
        query(BalancePayment, { $or: [{ 'lrEntries.lrNo': lrNo }, { lrNo }] }),
      ]);
      return [['pod', pods], ['balance', balances]];
    }
    case 'pod': {
      const [balances] = await Promise.all([query(BalancePayment, { podNo: no(doc.podNo) })]);
      return [['balance', balances]];
    }
    default: return [];
  }
}

export async function resolveDeleteGraph(type, root, companyId, session) {
  const result = [];
  const seen = new Set();
  async function walk(currentType, current, depth) {
    const key = `${currentType}:${id(current)}`;
    if (!current?._id || seen.has(key)) return;
    seen.add(key);
    result.push({ type: currentType, id: id(current), no: current[TYPES[currentType].no] || current.lrNo || current.podNo || id(current), label: TYPES[currentType].label, depth, record: current });
    for (const [childType, docs] of await childrenOf(currentType, current, companyId, session)) {
      for (const child of docs) await walk(childType, child, depth + 1);
    }
  }
  await walk(type, root, 0);
  return result;
}

export async function deletionBlockers(graph, companyId, session) {
  const blockers = [];
  const lrs = graph.filter((item) => item.type === 'lr');
  const [productBills, generalBills] = await Promise.all([
    getBilledLrNumbers(companyId, 'product-wise'),
    getBilledLrNumbers(companyId, 'general'),
  ]);
  const billed = new Set([...productBills, ...generalBills]);
  for (const item of graph) {
    const doc = item.record;
    if (item.type === 'advance' && ['Paid', 'Completed'].includes(doc.paymentDetails?.paymentStatus || doc.paymentStatus || doc.status)) blockers.push(`${item.label} ${item.no} is paid or completed`);
    if (item.type === 'balance' && ['Paid', 'Completed'].includes(doc.paymentDetails?.paymentStatus || doc.paymentStatus || doc.status)) blockers.push(`${item.label} ${item.no} is paid or completed`);
    if (item.type === 'pod' && item.depth > 0) blockers.push(`POD ${item.no} exists for a linked LR`);
    if (item.type === 'lr' && billed.has(no(doc.lrNo))) blockers.push(`LR ${item.no} is already in a saved bill`);
  }
  for (const item of graph.filter((entry) => entry.type === 'loading')) {
    const linked = lrs.filter((lr) => no(lr.record.loadingInfoNo) === no(item.no));
    const finalized = ['Approved', 'Completed'].includes(item.record.panelStatus || item.record.status) && linked.length > 0 && linked.every((lr) => ['Approved', 'Completed'].includes(lr.record.header?.status) && !!no(lr.record.invoice?.file?.filePath));
    if (finalized) blockers.push(`Loading Info ${item.no} is finalized`);
  }
  return [...new Set(blockers)];
}
