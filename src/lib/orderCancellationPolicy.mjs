const id = value => String(value?._id || value || '');
const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
export function matchesCancelledOrder(row, order, targets) {
  const rowId = id(row.orderRowId || row.sourceRowId);
  if (rowId && targets.some(source => id(source) === rowId)) return true;
  if (row.orderPanelId && id(row.orderPanelId) !== id(order)) return false;
  if (row.orderNo && !same(row.orderNo, order.orderPanelNo)) return false;
  if (row.orderPanelId || row.orderNo) {
    if (targets.length === order.plantRows.length) return true;
    if (rowId) return false;
    const candidates = order.plantRows.filter(source =>
      (!row.toName && !row.to || same(row.toName || row.to, source.toName || source.to)) &&
      (!row.plantName && !row.plantCode && !row.plantCodeValue || same(row.plantCodeValue || row.plantName || row.plantCode, source.plantCodeValue || source.plantName || source.plantCode)));
    return candidates.length === 1 && targets.some(source => id(source) === id(candidates[0]));
  }
  return false;
}

/** Plan by source identity first; shared descendants never inherit whole-record cancellation. */
export function planOrderCancellation(order, targets, graph) {
  const plans = [];
  const byType = type => plans.filter(plan => plan.type === type);
  for (const type of ['vnn', 'pricing', 'loading', 'purchase', 'lr', 'advance', 'pod', 'balance']) {
    for (const item of graph.filter(item => item.type === type)) {
      const doc = item.record;
      const rows = doc.orders || doc.orderRows || [];
      let affected = rows.map((row, index) => matchesCancelledOrder(row, order, targets) ? index : -1).filter(index => index >= 0);
      if (type === 'pricing') affected = rows.map((row, index) => matchesCancelledOrder(row, order, targets) || byType('vnn').some(parent => parent.full && id(row.vehicleNegotiationId) === parent.id) ? index : -1).filter(index => index >= 0);
      let linked = affected.length > 0;
      let full = linked && rows.every((row, index) => affected.includes(index) || row.status === 'Cancelled' || row.cancellationStatus === 'Cancelled');
      if (type === 'loading' && !linked) {
        const parent = byType('vnn').find(parent => same(parent.no, doc.vehicleNegotiationNo));
        linked = !!parent; full = !!parent?.full && !rows.length;
      }
      if (type === 'lr') {
        linked = matchesCancelledOrder({ ...doc.header, orderRowId: doc.orderRowId }, order, targets);
        if (!doc.orderRowId && !doc.header?.orderNo) linked = byType('loading').some(parent => parent.full && same(parent.no, doc.loadingInfoNo));
        full = linked;
      }
      if (type === 'purchase' && !linked) { const parent = byType('loading').find(parent => same(parent.no, doc.loadingInfoNo)); linked = !!parent; full = !!parent?.full && !rows.length; }
      if (type === 'advance') { const parent = byType('purchase').find(parent => same(parent.no, doc.purchaseNo)); linked = !!parent; full = !!parent?.full; }
      if (type === 'pod' || type === 'balance') {
        linked = (doc.lrEntries || []).some(row => byType('lr').some(parent => same(parent.no, row.lrNo))) || byType('lr').some(parent => same(parent.no, doc.lrNo));
        if (type === 'balance' && !linked) linked = byType('pod').some(parent => same(parent.no, doc.podNo));
        if (!linked && doc.purchaseNo) linked = byType('purchase').some(parent => same(parent.no, doc.purchaseNo));
        full = linked && (doc.lrEntries || []).every(row => byType('lr').some(parent => same(parent.no, row.lrNo)));
      }
      if (linked) plans.push({ ...item, affected, full });
    }
  }
  const blockers = plans.flatMap(item => {
    const doc = item.record;
    if (item.type === 'pod') return [{ type: 'pod', record: item.no, reason: `POD ${item.no} is recorded for a linked LR.` }];
    if (['advance', 'balance'].includes(item.type) && [doc.status, doc.paymentStatus, doc.paymentDetails?.paymentStatus].some(status => ['paid', 'completed'].includes(String(status || '').toLowerCase()))) return [{ type: item.type, record: item.no, reason: `${item.label} ${item.no} is paid or completed.` }];
    return [];
  });
  return { plans, blockers };
}
