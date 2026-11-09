export const PACKED_STATUSES = ['Fully Packed', 'Not Packed', 'Partially Packed'];
export function materials(order) {
  return Object.entries(order.packData || {}).flatMap(([packType, rows]) => (Array.isArray(rows) ? rows : []).map(row => ({
    materialId: String(row._id), packType, productName: row.productName || '', pkgsType: row.pkgsType || '', skuSize: row.skuSize || '',
    orderedQty: Number(row.totalPkgs ?? row.nos ?? row.actualWt ?? 0), unit: row.totalPkgs != null ? 'Pkgs' : row.nos != null ? 'Nos' : row.uom || 'MT',
    plantRowId: String(row.plantRowId || ''), actualWt: row.actualWt, chargedWt: row.chargedWt,
  })));
}
export const fingerprint = row => JSON.stringify([row.productName, row.packType, row.pkgsType, row.skuSize, row.orderedQty, row.unit, row.plantRowId, row.actualWt, row.chargedWt]);
export function editableOrder(order) {
  return !order.isDraft && ['Approved', 'Partially on hold'].includes(order.panelStatus) &&
    !['unlocked', 'pendingApproval', 'pendingReapproval', 'blockedByUpstream', 'syncFailed'].includes(order.reapprovalState) &&
    (!order.plantRows?.length || order.plantRows.some(row => (row.status || 'Open') === 'Open'));
}
export function inspectionView(order, saved) {
  const items = materials(order).map(row => {
    const item = saved?.items?.find(item => String(item.materialId) === row.materialId);
    const current = item?.fingerprint === fingerprint(row);
    const lane = order.plantRows?.find(lane => String(lane._id) === row.plantRowId);
    const editable = lane ? (lane.status || 'Open') === 'Open' && !lane.statusRequest?.action : !order.plantRows?.some(lane => (lane.status || 'Open') !== 'Open' || lane.statusRequest?.action);
    return { ...row, editable, packedStatus: current ? item.packedStatus : '', availableQty: current ? item.availableQty : '', needsReview: !!item && !current };
  });
  const inspected = items.filter(row => PACKED_STATUSES.includes(row.packedStatus) && typeof row.availableQty === 'number' && Number.isFinite(row.availableQty)).length;
  return { orderId: String(order._id), orderNo: order.orderPanelNo, partyName: order.partyName || order.customerName, branchName: order.branchName,
    branchCode: order.branchCode, date: order.date, subCompanyName: order.subCompanyName, subCompanyCode: order.subCompanyCode, totalWeight: order.totalWeight, panelStatus: order.panelStatus,
    routes: (order.plantRows || []).map(row => ({ plantName: row.plantName, plantCode: row.plantCodeValue, from: row.fromName, to: row.toName, district: row.districtName || row.district, state: row.stateName || row.state, pin: row.pinCode, status: row.status || 'Open' })),
    status: inspected === 0 ? 'Pending' : inspected === items.length ? 'Completed' : 'In Progress', items,
    editable: editableOrder(order), revision: saved?.__v ?? -1, inspectedBy: saved?.inspectedBy, inspectedAt: saved?.inspectedAt };
}
export function mergeInspection(order, saved, updates) {
  if (!editableOrder(order)) throw new Error('PDI edits require an approved order with open rows and no pending correction.');
  if (!Array.isArray(updates) || !updates.length) throw new Error('Provide at least one material inspection.');
  const rows = materials(order), seen = new Set();
  const merged = new Map((saved?.items || []).filter(item => rows.some(row => row.materialId === String(item.materialId))).map(item => [String(item.materialId), item]));
  for (const input of updates) {
    const row = rows.find(row => row.materialId === input.materialId);
    if (!row || seen.has(input.materialId)) throw new Error('Invalid or duplicate material ID.');
    seen.add(input.materialId);
    const lane = order.plantRows?.find(lane => String(lane._id) === row.plantRowId);
    if ((lane && ((lane.status || 'Open') !== 'Open' || lane.statusRequest?.action)) || (!row.plantRowId && order.plantRows?.some(lane => (lane.status || 'Open') !== 'Open' || lane.statusRequest?.action))) throw new Error('This material belongs to a held/cancelled route or requires route clarification.');
    if (!PACKED_STATUSES.includes(input.packedStatus)) throw new Error('Select a valid packing status.');
    if (typeof input.availableQty !== 'number' || !Number.isFinite(input.availableQty) || input.availableQty < 0 || input.availableQty > row.orderedQty) throw new Error('Available quantity must be a number between 0 and ordered quantity.');
    merged.set(row.materialId, { ...row, fingerprint: fingerprint(row), packedStatus: input.packedStatus, availableQty: input.availableQty });
  }
  return [...merged.values()];
}
