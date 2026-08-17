/**
 * Shared, presentation-safe helpers for the Vehicle Negotiation workflow.
 * Keep the per-part decisions in the record; consumers use the derived final
 * status so they never have to depend on retired approvalStatus fields.
 */
export function getFinalVnnStatus(record) {
  return record?.approval?.part3Status === 'Approved' ? 'Approved' :
    record?.approval?.part3Status === 'Reject' ? 'Reject' : 'Pending';
}

export function isVnnReadyForDownstream(record) {
  const placement = record?.approval || {};
  const placementComplete = Boolean(record?.workflow?.placementCompletedAt) || [
    placement.vehicleNo,
    placement.mobile,
    placement.purchaseType,
    placement.paymentTerms,
  ].every((value) => String(value || '').trim());
  return getFinalVnnStatus(record) === 'Approved' && placementComplete;
}

export function getVnnPartyName(record) {
  return record?.partyName || record?.customerName || record?.orders?.find((order) => order?.partyName)?.partyName || '';
}

export function getVnnOrderNumbers(record) {
  return [...new Set((record?.orders || []).map((order) => order?.orderNo).filter(Boolean))];
}

export function withVnnDisplayData(record) {
  const orderNumbers = getVnnOrderNumbers(record);
  return {
    ...record,
    partyName: getVnnPartyName(record),
    vendorName: record?.approval?.vendorName || '',
    orderNumbers,
    finalApprovalStatus: getFinalVnnStatus(record),
    isReadyForDownstream: isVnnReadyForDownstream(record),
  };
}
