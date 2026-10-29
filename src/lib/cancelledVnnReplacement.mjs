const text = value => String(value ?? '').trim();
const lower = value => text(value).toLowerCase();
const id = value => text(value?._id || value);
const fail = message => { throw Object.assign(new Error(message), { status: 409 }); };
const cancelled = row => ['cancelled', 'canceled'].includes(lower(row?.status));

function sourceFor(row, panels) {
  const panel = panels.find(item => id(item) === text(row.orderPanelId)) || panels.find(item => lower(item.orderPanelNo) === lower(row.orderNo));
  if (!panel) return {};
  if (row.orderRowId) return { panel, row: panel.plantRows?.find(item => id(item) === text(row.orderRowId)) };
  // Legacy rows without a source row id must resolve unambiguously.
  const matches = (panel.plantRows || []).filter(item =>
    [item.plantCode, item.plantCodeValue, item.plantName].some(value => value && [row.plantCode, row.plantCodeValue, row.plantName].some(v => v && lower(v) === lower(value))) &&
    (!row.from && !row.fromName || [item.from, item.fromName].some(value => value && [row.from, row.fromName].some(v => v && lower(v) === lower(value)))) &&
    (!row.to && !row.toName || [item.to, item.toName].some(value => value && [row.to, row.toName].some(v => v && lower(v) === lower(value)))));
  return { panel, row: matches.length === 1 ? matches[0] : undefined };
}

/** Build an order-only change from authoritative source rows, never client prices. */
export function planCancelledVnnReplacement(record, panels, requestedRows) {
  // Final VNN approval is defined by Part 3 (as in getFinalVnnStatus and the
  // editor). Older records can retain Draft/Submitted in panelStatus even
  // after final approval; that legacy label must not block this narrow action.
  if (record.approval?.part3Status !== 'Approved') fail('Only a VNN with final approval can use cancelled-order replacement. Refresh the record before trying again.');
  if (['cancelled', 'canceled'].includes(lower(record.panelStatus))) fail('This VNN itself is cancelled. Only cancelled order rows in an active VNN can be replaced.');
  if (!record.workflow?.part1Locked) fail('This VNN is already open for editing. Refresh the record before submitting replacements.');
  if (!['none', undefined, null, ''].includes(record.reapprovalState) || record.upstreamPending?.length) fail('This VNN has a pending correction or upstream review. Complete that review before replacing cancelled orders.');
  if (!Array.isArray(requestedRows) || !requestedRows.length || requestedRows.length > 100) fail('Select at least one open replacement order row (maximum 100).');
  const original = (record.orders || []).map(saved => ({ saved, ...sourceFor(saved, panels) }));
  if (original.some(item => !item.panel || !item.row)) fail('A linked source row could not be verified unambiguously. Refresh the VNN or ask an administrator to review its order links.');
  const removed = original.filter(item => cancelled(item.row));
  if (!removed.length) fail('No linked order row is currently cancelled. Other amendments require an admin unlock.');
  const kept = original.filter(item => !cancelled(item.row)).map(item => item.saved);
  const existing = new Set(original.filter(item => item.panel && item.row).map(item => `${id(item.panel)}:${id(item.row)}`));
  const seen = new Set();
  const added = requestedRows.map(request => {
    if (!request || Object.keys(request).some(key => !['orderPanelId', 'orderRowId'].includes(key))) fail('Replacement accepts source order references only. Rates and other VNN fields cannot be amended here.');
    const key = `${text(request.orderPanelId)}:${text(request.orderRowId)}`;
    if (seen.has(key) || existing.has(key)) fail('Each replacement must be a new, distinct open order row.');
    seen.add(key);
    const panel = panels.find(item => id(item) === text(request.orderPanelId));
    const row = panel?.plantRows?.find(item => id(item) === text(request.orderRowId));
    if (!panel || !row) fail('A selected replacement order row is unavailable in this company or branch. Refresh and select again.');
    if (panel.isDraft || ['Draft', 'Cancelled', 'Canceled'].includes(panel.panelStatus) || !['none', undefined, null, ''].includes(panel.reapprovalState) ||
        lower(row.status || 'Open') !== 'open' || row.statusRequest?.action) fail(`Order ${panel.orderPanelNo} is not open and ready for use.`);
    if (id(panel.branch) !== id(record.branch)) fail('Replacement orders must belong to the same branch as the original VNN.');
    if (panel.subCompanyId && record.subCompanyId && id(panel.subCompanyId) !== id(record.subCompanyId)) fail('Replacement orders must belong to the same operating company.');
    const result = {};
    for (const key of ['plantCode', 'plantName', 'plantCodeValue', 'orderType', 'pinCode', 'from', 'fromName', 'fromState', 'to', 'toName', 'locationRemark', 'taluka', 'talukaName', 'talukaId', 'district', 'districtName', 'districtId', 'state', 'stateName', 'stateId', 'country', 'countryName', 'localStatus', 'localStatusLabel']) {
      if (row[key] !== undefined) result[key] = row[key];
    }
    return { ...result, orderPanelId: id(panel), orderRowId: id(row), orderNo: panel.orderPanelNo,
      partyName: panel.partyName || panel.customerName || '', customerId: panel.customerId || null,
      customerCode: panel.customerCode || '', contactPerson: panel.contactPerson || '',
      weight: Number(row.weight) || 0, status: 'Open', collectionCharges: Number(panel.collectionCharges) || 0,
      cancellationCharges: String(panel.cancellationCharges ?? 'Nil'), loadingCharges: String(panel.loadingCharges ?? 'Nil'), otherCharges: Number(panel.otherCharges) || 0,
      subCompanyId: record.subCompanyId, subCompanyName: record.subCompanyName, subCompanyCode: record.subCompanyCode };
  });
  const orders = [...kept, ...added];
  const selectedOrderPanels = [...new Set(orders.map(row => text(row.orderPanelId)))].map(panelId => {
    const source = panels.find(item => id(item) === panelId);
    const saved = record.selectedOrderPanels?.find(item => id(item) === panelId);
    return { _id: panelId, orderPanelNo: source?.orderPanelNo || saved?.orderPanelNo || orders.find(row => text(row.orderPanelId) === panelId)?.orderNo || '',
      subCompanyId: record.subCompanyId, subCompanyName: record.subCompanyName, subCompanyCode: record.subCompanyCode };
  });
  return { orders, selectedOrderPanels, removed: removed.map(item => item.saved), added };
}
