const clean=value=>String(value || '').trim();
export function vnnPurchaseType(vendors=[],approval={}) {
  const code=clean(approval.vendorCode).toUpperCase(),name=clean(approval.vendorName).toLowerCase();
  if(!code && !name)return '';
  const matching=vendors.filter(row=>code?clean(row.vendorCode).toUpperCase()===code:clean(row.vendorName).toLowerCase()===name);
  const types=[...new Set(matching.map(row=>clean(row.purchaseType)).filter(Boolean))];
  return types.length===1?types[0]:'';
}
