// Consolidation is read-only and restricted to the same group administrator
// identity used by /api/group/overview. Never broaden ordinary user scope.
export function agingScope(user, scopedFilter) {
  if (user.type === 'company' && user.isGroupAdmin === true && !user.activeOperatingCompanyId) {
    return {filter:{companyId:user.companyId},scope:'JAYA GROUP · Consolidated'};
  }
  if (!user.activeOperatingCompanyId) {
    const error = new Error('Select an operating company from the workspace menu to view this report.');
    error.status = 400;
    throw error;
  }
  return {filter:scopedFilter(user),scope:user.activeOperatingCompanyName || user.activeOperatingCompanyCode || 'Selected operating company'};
}
