// First-time approval and settled records have no reapproval comparison to show.
export function hasReapprovalReview(record, state = record?.reapprovalState) {
  return Boolean(record?.approvedSnapshot) &&
    ['unlocked', 'pendingApproval', 'pendingReapproval', 'blockedByUpstream', 'syncFailed'].includes(state);
}
