export function isVnnCorrectionOpen(record) {
  return record?.reapprovalState === 'unlocked' && !record?.upstreamPending?.length &&
    !record?.workflow?.cancelledOrderReplacementOnly && !['cancelled','review'].includes(record?.cancellation?.state);
}

export function openVnnCorrectionParts(record) {
  if (!isVnnCorrectionOpen(record)) return false;
  record.workflow ||= {};
  record.approval ||= {};
  record.workflow.part1Locked = false;
  record.workflow.part1LockedAt = null;
  record.workflow.part1LockedBy = null;
  record.approval.part1Status = 'Pending';
  record.approval.part3Status = 'Pending';
  record.panelStatus = 'Draft';
  return true;
}
