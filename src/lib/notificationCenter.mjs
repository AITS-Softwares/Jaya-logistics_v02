const modulePaths = {
  'Order Panel': '/admin/order-panel', 'Vehicle Negotiation': '/admin/vehicle-negotiation',
  'Pricing Panel': '/admin/pricing-panel', 'Loading Info': '/admin/Loading-Info',
  'Consignment Note': '/admin/Consignment-Note', 'Purchase Panel': '/admin/Purchase-Panel',
  'Advance Payment': '/admin/Advance-Payment', 'Proof Of Delivery': '/admin/ProofofDelivery',
  'Billing': '/admin/Billing/reports',
  'Balance-Payment': '/admin/Balance-Payment', 'Balance Payment': '/admin/Balance-Payment',
  'Pricing Panel - Part 2 Approval': '/admin/pricing-panel',
};

export function workListPath(record) {
  // Keep client billing filters; other overview links lead to panel lists.
  return record.type === 'billing' ? record.path : modulePaths[record.module] || record.path;
}

export function describeActivity(item) {
  const type = item.type || '';
  let title = 'ERP update';
  let module = item.moduleName || '';
  let tone = 'info';
  if (type === 'billing-reminder') { title = 'Billing reminder'; tone = 'review'; }
  else if (type.startsWith('workflow-decision:')) { title = type.includes(':reject:') ? 'Returned for correction' : type.includes(':complete:') ? 'Work completed' : 'Record approved'; tone = type.includes(':reject:') ? 'warning' : 'info'; }
  else if (type.startsWith('approval-request:')) { title = 'Approval requested'; tone = 'review'; }
  else if (type.startsWith('pending-create:')) { title = 'Ready for the next step'; tone = 'review'; }
  else if (type.startsWith('pending-reapproval')) { title = 'Reapproval update'; tone = 'review'; }
  else if (type === 'vnn-replacement-needed') { title = 'Negotiation needs an update'; module ||= 'Vehicle Negotiation'; tone = 'review'; }
  else if (type === 'order-hold') { title = 'Order placed on hold'; module ||= 'Order Panel'; tone = 'review'; }
  else if (type === 'order-cancel') { title = 'Order cancelled'; module ||= 'Order Panel'; tone = 'warning'; }
  else if (type === 'order-status-approval') { title = 'Order change needs approval'; module ||= 'Order Panel'; tone = 'review'; }
  else if (type === 'pricing-cancellation-charge-required') { title = 'Cancellation charges required'; module ||= 'Pricing Panel'; tone = 'review'; }
  else if (type === 'push-test') { title = 'Notification test'; }
  else if (/reject/i.test(type)) { title = 'Record returned'; tone = 'warning'; }
  else if (/approv/i.test(type)) { title = 'Approval update'; }
  else if (/comment/i.test(type)) { title = 'New comment'; }
  else if (/assign/i.test(type)) { title = 'Assignment update'; }
  else if (/task/i.test(type)) { title = 'Task update'; }
  const numbers = (item.message || '').match(/\b[A-Z]{2,8}-(?:OP|VNN|PR|LI|LR|PP|AP|POD|BP)-[A-Z0-9-]+\b/g) || [];
  const reference = item.reference || (module === 'Vehicle Negotiation' ? numbers.find(no => no.includes('-VNN-')) : '') || numbers[0] || '';
  const url = item.url && item.url !== '/admin' ? item.url : modulePaths[module] || '';
  return { title, module, reference, url, tone, openLabel: item.url && item.url !== '/admin' ? 'Open record' : 'Open panel' };
}

export function groupActivity(items) {
  const groups = new Map();
  for (const item of [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))) {
    const display = describeActivity(item);
    const record = item.sourceModel && item.sourceRecordId ? `${item.sourceModel}:${item.sourceRecordId}`
      : display.reference ? `${display.module}:${display.reference}` : `notification:${item._id}`;
    if (!groups.has(record)) groups.set(record, { key: record, latest: item, display, items: [], unread: 0 });
    const group = groups.get(record);
    group.items.push(item);
    if (!item.read) group.unread++;
  }
  return [...groups.values()];
}

export function splitWork(records) {
  // No historical notification or read state can turn into a pending task.
  const live = records.filter(record => record.reapprovalState !== 'none');
  return { actions: live.filter(record => record.actionable === true), waiting: live.filter(record => record.actionable !== true) };
}

export function describeWork(record, { overview = false } = {}) {
  if (overview) {
    const display = describeWork(record);
    const neutral = {
      unlocked: ['Record under correction', 'Changes are being prepared for resubmission.'],
      pendingApproval: ['Awaiting approval', 'Submitted work is waiting for an authorised approver.'],
      pendingReapproval: ['Awaiting reapproval', 'Updated work is waiting for an authorised approver.'],
      syncFailed: ['Downstream update failed', 'Approval was saved, but the next stage still needs a sync retry.'],
    }[record.reapprovalState];
    return { ...display, ...(neutral ? { title: neutral[0], message: neutral[1] } : {}),
      ...(record.latestVnnSyncRequired || record.latestVnnSyncAmbiguous ? { title: 'Record sync pending', message: 'The responsible team needs to review negotiation links and synchronise this record.' } : {}),
      action: record.type === 'billing' ? 'Open billing' : 'View pending' };
  }
  if (record.type === 'billing') return { title: 'Billing due', message: `${record.lrCount} LR${record.lrCount === 1 ? '' : 's'} awaiting full billing. Reminders continue daily until billed.`, action: 'Open billing', tone: 'review' };
  if (record.latestVnnSyncAmbiguous) return { title: 'Review record links', message: 'Multiple approved negotiations match this record. An administrator needs to review the links.', action: 'Review links', tone: 'warning' };
  if (record.latestVnnSyncRequired) return { title: 'Sync before reapproval', message: `Bring in the latest approved data from ${record.latestVnnNo || 'Vehicle Negotiation'}, then review this record.`, action: 'Review sync', tone: 'review' };
  if (record.reapprovalState === 'unlocked') return { title: 'Correction required', message: 'Finish the changes and submit this record for approval.', action: 'Continue editing', tone: 'review' };
  if (record.reapprovalState === 'pendingApproval') return { title: 'Approval required', message: 'Review the submitted changes to move this record forward.', action: 'Review approval', tone: 'review' };
  if (record.reapprovalState === 'pendingReapproval') return { title: 'Reapproval required', message: 'Review the updated record and approve it to continue.', action: 'Review reapproval', tone: 'review' };
  if (record.reapprovalState === 'syncFailed') return { title: 'Downstream update failed', message: 'Approval was saved, but the next stage did not update. Coordinate a sync retry.', action: 'Review sync', tone: 'warning' };
  return { title: 'Waiting on another stage', message: record.upstreamDetails?.map(item => item.message).filter(Boolean).join(' ') || 'Upstream review must finish before this record can continue.', action: 'View status', tone: 'waiting' };
}
