// Detention rules are shared by all operating companies in one tenant.
export function detentionRuleFilter(user, filter = {}) {
  if (!user?.companyId) throw new Error('Company is required to access detention rules.');
  return { ...filter, companyId: user.companyId };
}
