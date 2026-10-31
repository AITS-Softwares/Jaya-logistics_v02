const approvalModules = {
  order: 'Order Panel',
  vnn: 'Vehicle Negotiation',
  pricing: 'Pricing Panel - Part 2 Approval',
  loading: 'Loading Info',
  lr: 'Consignment Note',
};

export function canUnlockForCorrection(user, type) {
  if (!Object.hasOwn(approvalModules, type)) return false;
  if (user?.type === 'company' || user?.roles?.includes('Admin')) return true;
  const module = user?.modules?.[approvalModules[type]];
  return module?.selected === true && module.permissions?.approve === true;
}
