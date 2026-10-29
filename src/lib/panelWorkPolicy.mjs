export const PANEL_WORK = [
  { key: 'order', module: 'Order Panel', path: 'order-panel', model: 'OrderPanel' },
  { key: 'vnn', module: 'Vehicle Negotiation', path: 'vehicle-negotiation', model: 'VehicleNegotiation', createEndpoint: '/api/vehicle-negotiation?lookup=pendingCount' },
  { key: 'pricing', module: 'Pricing Panel', approvalModule: 'Pricing Panel - Part 2 Approval', path: 'pricing-panel', model: 'PricingPanel', createEndpoint: '/api/pricing-panel/reference-data?lookup=pendingCount' },
  { key: 'loading', module: 'Loading Info', path: 'Loading-Info', model: 'LoadingPanel', createEndpoint: '/api/loading-panel/reference-data?lookup=pendingCount' },
  { key: 'lr', module: 'Consignment Note', path: 'Consignment-Note', model: 'ConsignmentNote', createEndpoint: '/api/consignment-note?lookup=pendingCount' },
  { key: 'purchase', module: 'Purchase Panel', path: 'Purchase-Panel', model: 'PurchasePanel', createEndpoint: '/api/purchase-panel/reference-data?lookup=pendingCount' },
  { key: 'advance', module: 'Advance Payment', path: 'Advance-Payment', model: 'AdvancePayment', createEndpoint: '/api/purchase-panel?for=advance-payment&format=table&count=1' },
  { key: 'pod', module: 'Proof Of Delivery', path: 'ProofofDelivery', model: 'POD', createEndpoint: '/api/purchase-panel?for=pod&format=table&count=1' },
  { key: 'balance', module: 'Balance-Payment', label: 'Balance Payment', path: 'Balance-Payment', model: 'BalancePayment', createEndpoint: '/api/balance-payment/pod-lookup?lookup=pendingCount' },
];

export function panelWorkPermission(user, moduleName, action) {
  if (user.type === 'company' || (user.roles || []).some(role => ['admin', 'company admin', 'company administrator'].includes(String(role).toLowerCase()))) return true;
  const module = user.modules instanceof Map ? user.modules.get(moduleName) : user.modules?.[moduleName];
  return module?.selected === true && module.permissions?.[action] === true;
}

export function panelApprovalFilter(key) {
  const initial = {
    order: { panelStatus: 'Submitted' },
    vnn: { 'approval.part3Status': 'Pending', 'workflow.part1Locked': true },
    pricing: { 'rateApproval.approvalStatus': 'Pending', $or: [{ 'rateApproval.workflowPhase': 'part2' }, { 'rateApproval.workflowPhase': { $in: ['', null] }, panelStatus: 'Submitted' }] },
    loading: { panelStatus: { $in: ['Submitted', 'Draft'] } },
    lr: { 'header.status': 'Pending' },
    purchase: { 'approval.status': 'Pending' },
    advance: { 'paymentDetails.paymentStatus': 'Pending', 'bankIntegration.provider': { $ne: 'ICICI_CIB' } },
    pod: { $or: [{ approvalStatus: 'Pending' }, { approvalStatus: { $in: ['', null] }, podStatus: 'Pending' }] },
    balance: { paymentStatus: 'Pending', 'bankIntegration.provider': { $ne: 'ICICI_CIB' } },
  }[key];
  return { $and: [
    { isDraft: { $ne: true }, isDeleted: { $ne: true }, panelStatus: { $nin: ['Cancelled', 'Canceled'] }, 'header.status': { $nin: ['Cancelled', 'Canceled'] },
      ...(key === 'pricing' ? { 'rateApproval.workflowPhase': { $ne: 'part1' } } : {}),
      ...(key === 'vnn' ? { 'workflow.part1Locked': true } : {}),
      reapprovalState: { $nin: ['unlocked', 'blockedByUpstream', 'syncFailed'] }, 'upstreamPending.0': { $exists: false } },
    { $or: [initial, { reapprovalState: { $in: ['pendingApproval', 'pendingReapproval'] } }] },
  ] };
}

/** Current counts only; reading Activity never changes these values. */
export async function buildPanelWorkSummaries({ user, countCreation, countApproval }) {
  const warnings = [];
  const rows = await Promise.all(PANEL_WORK.map(async panel => {
    const create = Boolean(panel.createEndpoint) && panelWorkPermission(user, panel.module, 'create');
    const approve = panelWorkPermission(user, panel.approvalModule || panel.module, 'approve');
    if (!create && !approve) return null;
    const results = await Promise.allSettled([
      create ? countCreation(panel) : Promise.resolve(0),
      approve ? countApproval(panel, panelApprovalFilter(panel.key)) : Promise.resolve(0),
    ]);
    const [createCount, approvalCount] = results.map((result, index) => {
      if (result.status === 'rejected') { warnings.push(`${panel.label || panel.module}: could not load ${index ? 'approval' : 'creation'} count.`); return 0; }
      return Math.max(0, Number(result.value) || 0);
    });
    if (!createCount && !approvalCount) return null;
    return { type: 'panel-summary', id: `panel:${panel.key}`, module: panel.module, no: panel.label || panel.module,
      reapprovalState: 'pendingPanelWork', actionable: true, createCount, approvalCount,
      createPath: `/admin/${panel.path}`, path: `/admin/${panel.path}` };
  }));
  return { records: rows.filter(Boolean), warnings: warnings.sort() };
}

export function mergePanelWork(reviewRecords, summaries, billingRecords) {
  const summariesByModule = new Map(summaries.map(record => [record.module, record]));
  const reviews = reviewRecords.filter(record => {
    if (!record.actionable || record.latestVnnSyncRequired || record.latestVnnSyncAmbiguous) return true;
    // Panel approval counts already include these records. Keep correction,
    // sync and waiting details without duplicating individual approval cards.
    return !(['pendingApproval', 'pendingReapproval'].includes(record.reapprovalState) && summariesByModule.get(record.module)?.approvalCount > 0);
  });
  return [...summaries, ...reviews, ...billingRecords];
}
