export function hasPriorApproval(record) {
  return Boolean(record?.approvedSnapshot) || Number(record?.approvedRevision || 0) > 0 ||
    Number(record?.rateApproval?.approvedRevision || 0) > 0;
}

export function panelApprovalStatus(type, record) {
  const lifecycle = record?.panelStatus || record?.status || '';
  if (['Cancelled', 'Canceled', 'Hold', 'On Hold'].includes(lifecycle)) return lifecycle;
  if (record?.isDraft || lifecycle === 'Draft') return 'Draft';
  if (type === 'vnn') {
    if (['Submitted', 'Negotiating', 'Rejected'].includes(lifecycle)) return lifecycle;
    return record?.approval?.part3Status || lifecycle || 'Pending';
  }
  if (type === 'pricing') {
    const approval = record?.rateApproval;
    if (['part1', 'part2'].includes(approval?.workflowPhase) && ['Approved', 'Completed'].includes(approval?.approvalStatus)) return 'Pending';
    return approval?.approvalStatus || lifecycle || 'Pending';
  }
  if (type === 'lr') return record?.header?.status || lifecycle || 'Draft';
  return lifecycle || record?.header?.status || 'Draft';
}

export function reviewDisplayState(record, state = record?.reapprovalState) {
  // Preserve legacy callers with no approval-history information; API responses
  // explicitly distinguish first approval from approval of an existing record.
  if (state === 'pendingReapproval' && record?.previouslyApproved === false) return 'pendingApproval';
  return state || 'none';
}

export function approvalLabelForRecord(record) {
  const state = reviewDisplayState(record);
  if (!['blockedByUpstream', 'syncFailed'].includes(state)) {
    const stageLabel = loadingStageLabel(record);
    if (stageLabel) return stageLabel;
  }
  const labels = { unlocked: 'Under correction', pendingApproval: 'Pending approval', pendingReapproval: 'Pending reapproval', blockedByUpstream: 'Waiting for upstream review', syncFailed: 'Sync review needed' };
  if (state !== 'none') return labels[state] || state;
  const status = String(record.status || '').trim();
  if (/^(cancelled|canceled|hold|on hold)$/i.test(status)) return null;
  if (/^(submitted|pending|pending approval)$/i.test(status)) return 'Pending approval';
  if (/^(rejected|reject|returned)$/i.test(status)) return 'Returned for correction';
  return status || 'Status unavailable';
}

export function upstreamDisplayState(type, record) {
  if (!record) return 'unknown';
  const state = record.reapprovalState || 'none';
  if (state !== 'none') return reviewDisplayState({ previouslyApproved: hasPriorApproval(record) }, state);
  const status = panelApprovalStatus(type, record);
  if (['Approved', 'Completed'].includes(status)) return 'none';
  if (['Submitted', 'Pending', 'Pending from Team', 'Pending from Client'].includes(status)) return 'pendingApproval';
  return status.toLowerCase();
}
import { loadingStageLabel } from './loadingApprovalWorkflow.mjs';

