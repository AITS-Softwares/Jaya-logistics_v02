const DAY = 86400000;
export const billingKey = value => String(value?._id || value || '').trim();
const normalized = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export const isYaraClient = name => /(^|\s)yara(\s|$)/.test(normalized(name));
export function indiaDateKey(value = new Date()) {
  return new Date(new Date(value).getTime() + 330 * 60000).toISOString().slice(0, 10);
}
export function billingReminderDueAt(createdAt, clientName) {
  const created = new Date(createdAt);
  if (!Number.isFinite(created.getTime())) return null;
  const day = indiaDateKey(created);
  if (isYaraClient(clientName)) return new Date(`${day.slice(0, 7)}-${Math.max(25, Number(day.slice(8))).toString().padStart(2, '0')}T00:00:00+05:30`);
  return new Date(new Date(`${day}T00:00:00+05:30`).getTime() + 5 * DAY);
}
export function billQuantity(row) {
  const value = Number(row?.billQuantity ?? row?.billedWt ?? row?.weight ?? row?.quantity ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
export function isReminderLr(note) {
  return !note.isDeleted && !note.isDraft && !['draft', 'cancelled', 'canceled', 'rejected', 'reject'].includes(normalized(note.header?.status));
}
export function remainingBillingQuantity(note, reports) {
  let quantity = 0; let found = false;
  for (const report of reports) {
    if (!['general', 'product-wise', 'mosaic'].includes(report.type) || report.isDeleted) continue;
    for (const row of report.data || []) if (billingKey(row.lrNo) === billingKey(note.lrNo)) { found = true; quantity += billQuantity(row); }
  }
  const total = Math.max(0, Number(note.totalWeight) || 0);
  return { fullyBilled: found && (total <= 0 || quantity + 0.000001 >= total), remaining: Math.max(0, total - quantity) };
}
export function hasBillingWorkPermission(user) {
  if (!user || user.isActive === false) return false;
  if (user.type === 'company' || (user.roles || []).some(role => ['admin', 'company admin', 'company administrator'].includes(String(role).toLowerCase()))) return true;
  const module = user.modules instanceof Map ? user.modules.get('Billing') : user.modules?.Billing;
  return module?.selected === true && module.permissions?.create === true && module.permissions?.view === true;
}

export function billingGroupsForUser(user, groups, { operatingCompanyId } = {}) {
  if (!hasBillingWorkPermission(user)) return [];
  return groups.flatMap(group => {
    if (billingKey(user.companyId) !== billingKey(group.companyId)) return [];
    if (operatingCompanyId && billingKey(operatingCompanyId) !== billingKey(group.subCompanyId)) return [];
    if (user.type !== 'company' && user.accessAllOperatingCompanies !== true && !(user.operatingCompanyIds || []).some(id => billingKey(id) === billingKey(group.subCompanyId))) return [];
    const rows = group.rows.filter(row => user.type === 'company' || user.accessAllBranches !== false || row.branchIds?.length && row.branchIds.every(branch => (user.branchIds || []).some(id => billingKey(id) === billingKey(branch))));
    if (!rows.length) return [];
    return [{ ...group, rows, branchIds: [...new Set(rows.flatMap(row => row.branchIds || []))] }];
  });
}
