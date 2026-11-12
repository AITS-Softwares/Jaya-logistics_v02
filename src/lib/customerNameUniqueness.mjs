export function customerNameQuery(companyId, name, excludeId) {
  const trimmed = String(name || '').trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    companyId,
    customerName: { $regex: `^\\s*${escaped}\\s*$`, $options: 'i' },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  };
}
