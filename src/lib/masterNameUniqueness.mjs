import { customerNameQuery } from './customerNameUniqueness.mjs';

export function masterNameQuery(companyId, field, name, excludeId) {
  const query = customerNameQuery(companyId, name, excludeId);
  const match = query.customerName;
  delete query.customerName;
  return { ...query, $or: [{ [field]: match }, { [`pendingChange.data.${field}`]: match }] };
}

export async function duplicateMasterName(Model, companyId, field, name, excludeId) {
  return Boolean(await Model.findOne(masterNameQuery(companyId, field, name, excludeId))
    .setOptions({ includeUnapprovedMasters: true }).select('_id').lean());
}
