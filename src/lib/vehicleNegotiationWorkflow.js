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
  return getFinalVnnStatus(record) === 'Approved';
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
    orderNumbers,
    finalApprovalStatus: getFinalVnnStatus(record),
    isReadyForDownstream: isVnnReadyForDownstream(record),
  };
}
