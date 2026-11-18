const plain = (value) => value?.toObject?.() || value || {};
const same = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

// Refresh the source fields only. Purchase-owned rates, terms, deductions,
// additions and payment amounts remain for the Purchase editor to review.
export function syncPurchaseFromLoading(loading, purchase) {
  const rows = loading.orderRows || [];
  let matched = 0;
  const used = new Set();
  for (const target of purchase.orderRows || []) {
    let candidates = target.orderRowId
      ? rows.filter((row) => same(row.orderRowId, target.orderRowId))
      : [];
    if (!candidates.length) candidates = rows.filter((row) => same(row.orderNo, target.orderNo) &&
          same(row.plantCodeValue || row.plantName || row.plantCode, target.plantCodeValue || target.plantName || target.plantCode) &&
          same(row.toName || row.to, target.toName || target.to));
    if (candidates.length !== 1 || used.has(candidates[0])) continue;
    const source = candidates[0];
    used.add(source);
    for (const field of ['orderRowId', 'orderNo', 'partyName', 'plantCode', 'plantName', 'orderType', 'pinCode', 'fromState', 'weight', 'locationRemark']) {
      if (source[field] !== undefined) target[field] = source[field];
    }
    for (const [from, to] of Object.entries({fromName:'from', toName:'to', talukaName:'taluka', districtName:'district', stateName:'state', countryName:'country'})) {
      if (source[from] !== undefined) target[to] = source[from];
    }
    if (source.fromName !== undefined) target.fromName = source.fromName;
    if (source.toName !== undefined) target.toName = source.toName;
    if (source.stateName !== undefined) target.stateName = source.stateName;
    matched++;
  }
  purchase.purchaseDetails = { ...plain(purchase.purchaseDetails) };
  const vehicle = loading.vehicleInfo || {};
  if (vehicle.vehicleNo !== undefined) purchase.purchaseDetails.vehicleNo = vehicle.vehicleNo;
  if (vehicle.driverMobileNo !== undefined) purchase.purchaseDetails.driverMobileNo = vehicle.driverMobileNo;
  return { matched, ambiguous: !matched || matched !== (purchase.orderRows || []).length || used.size !== rows.length };
}
