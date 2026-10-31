const part2Fields = new Set([
  'vlUploads', 'vlPhotoDetails', 'vlFields', 'votUploads', 'loadedWeighment',
  'loadedVehicleSlips', 'detentionDays', 'arrivalDetails', 'gpsTracking',
  'consignmentNote', 'invoice', 'ewaybill', 'totalCharges',
]);
const part1Fields = new Set([
  'header', 'vehicleInfo', 'orderRows', 'packData', 'deductionRows', 'totalQuantity',
  'vbpUploads', 'vftUploads', 'totalWeight', 'totalActualWeight', 'activePack',
  'vehicleNegotiationNo', 'selectedVehicle', 'selectedVehicleNegotiation',
  'vehiclePhotos', 'vehicleSlips', 'hasHelper', 'helperInfo',
]);
export const isStagedLoading = record => record?.loadingWorkflow?.version === 2;
export function loadingPart(record) {
  return isStagedLoading(record) ? record.loadingWorkflow.currentPart : 0;
}
export function newLoadingWorkflow(submitted = false) {
  return { version: 2, currentPart: 1, part1Status: submitted ? 'Submitted' : 'Draft', part2Status: 'Locked' };
}
export function loadingStageLabel(record) {
  if (!isStagedLoading(record)) return null;
  const part = record.loadingWorkflow.currentPart;
  const status = record.loadingWorkflow[`part${part}Status`];
  if (status === 'Submitted') return `Part ${part} pending ${record.approvedSnapshot || Number(record.approvedRevision || 0) > 0 ? 'reapproval' : 'approval'}`;
  if (status === 'Rejected') return `Part ${part} returned for correction`;
  if (status === 'Draft') return part === 2 ? 'Part 2 open for editing' : 'Part 1 draft';
  if (record.loadingWorkflow.part2Status === 'Approved') return 'Approved';
  return `Part ${part} ${String(status || '').toLowerCase()}`;
}
export function loadingWorkflowForReview(record) {
  if (!isStagedLoading(record)) {
    if (record.reapprovalState === 'unlocked') return newLoadingWorkflow();
    if (record.reapprovalState === 'pendingReapproval') return newLoadingWorkflow(true);
    if (!['Approved', 'Completed', 'Cancelled'].includes(record.panelStatus)) {
      return newLoadingWorkflow(!record.isDraft && ['Draft', 'Submitted'].includes(record.panelStatus));
    }
  }
  if (isStagedLoading(record) && record.loadingWorkflow.part2Status === 'Approved' && record.reapprovalState === 'pendingReapproval') {
    return newLoadingWorkflow(true);
  }
  return record.loadingWorkflow;
}
const fail = message => { throw Object.assign(new Error(message), { status: 409 }); };
export function editableLoadingPart(record) {
  if (!isStagedLoading(record)) return 0;
  if (record.reapprovalState === 'unlocked' && record.loadingWorkflow.part2Status === 'Approved') return 1;
  const part = loadingPart(record);
  return ['Draft', 'Rejected'].includes(record.loadingWorkflow[`part${part}Status`]) ? part : null;
}
export function filterLoadingFields(data, part) {
  const fields = part === 1 ? part1Fields : part2Fields;
  return Object.fromEntries(Object.entries(data).filter(([key]) => fields.has(key)));
}
export function prepareLoadingEdit(record, data, saveMode) {
  const part = editableLoadingPart(record);
  if (!part) fail('This Loading Info part is locked or waiting for approval.');
  if (!['draft', 'submit'].includes(saveMode)) fail('Save this part as a draft or submit it for approval.');
  let workflow = record.loadingWorkflow.toObject?.() || { ...record.loadingWorkflow };
  if (part === 1 && workflow.part2Status === 'Approved') workflow = newLoadingWorkflow();
  workflow.currentPart = part;
  workflow[`part${part}Status`] = saveMode === 'submit' ? 'Submitted' : 'Draft';
  const filtered = filterLoadingFields(data, part);
  // Upload approval decisions belong to approvers, never editors.
  for (const key of ['vbpUploads', 'vftUploads', 'vlUploads', 'votUploads', 'loadedWeighment']) {
    if (!filtered[key]) continue;
    filtered[key] = { ...filtered[key], approval: record[key]?.approval || '' };
    if (key === 'vbpUploads') filtered[key].remark = record[key]?.remark || '';
  }
  return { ...filtered, loadingWorkflow: workflow, isDraft: saveMode === 'draft', panelStatus: saveMode === 'submit' ? 'Submitted' : 'Draft' };
}
export function loadingApprovalDecision(record, fields, action, user, at = new Date()) {
  const workflow = record.loadingWorkflow.toObject?.() || { ...record.loadingWorkflow };
  const part = workflow.currentPart;
  if (workflow[`part${part}Status`] !== 'Submitted') fail('Submit this part before approving it.');
  if (action === 'complete') fail('Approve Part 2 to complete the Loading Info approval.');
  const keys = part === 1 ? ['vbpApproval', 'vftApproval'] : ['vlApproval', 'votApproval', 'weighmentApproval'];
  const statuses = keys.map(key => fields[key] || (action === 'reject' ? 'Rejected' : 'Approved'));
  if (statuses.some(value => !['Approved', 'Pending', 'Rejected'].includes(value))) fail('Invalid section approval status.');
  const status = action === 'reject' || statuses.includes('Rejected') ? 'Rejected' : statuses.includes('Pending') ? 'Submitted' : 'Approved';
  workflow[`part${part}Status`] = status;
  if (status === 'Approved') {
    workflow[`part${part}ApprovedBy`] = user.id;
    workflow[`part${part}ApprovedAt`] = at;
    if (part === 1) { workflow.currentPart = 2; workflow.part2Status = 'Draft'; }
  }
  return { workflow, part, status, final: part === 2 && status === 'Approved' };
}
