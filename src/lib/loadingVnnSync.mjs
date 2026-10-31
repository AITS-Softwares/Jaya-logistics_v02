export function hasLoadingCorrectionContext(record) {
  return (record.upstreamPending || []).some(marker => ['order', 'vnn'].includes(marker.panel)) ||
    (record.reapprovalHistory || []).some(event => ['detachedOrderBlockCleared', 'syncedFromLatestVnn'].includes(event.action));
}

export function needsLoadingVnnComparison(record, candidate) {
  if (hasLoadingCorrectionContext(record)) return true;
  const dependency = (record.sourceDependencies || []).find(source => source.panel === 'vnn' &&
    (String(source.recordId || '') === String(candidate._id) || source.recordNo === candidate.vnnNo));
  if (dependency) return Number(candidate.approvedRevision || 0) > Number(dependency.revision || 0);
  // Legacy settled records may predate dependency tracking. Initial submissions
  // have no prior approval to compare and must not enter correction by inference.
  return Boolean(record.approvedSnapshot) || Number(record.approvedRevision || 0) > 0;
}
