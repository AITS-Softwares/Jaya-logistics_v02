const clean=value=>String(value || '').trim();

export const INVALID_VNN_FIXED_RATE = 'Enter a valid non-negative amount in Final - Fix.';

export function parseVnnFixedRate(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== 'string') return null;
  const amount = value.trim().replace(/^₹\s*/, '');
  if (!amount) return value.trim() ? null : 0;
  if (!/^(?:\d+(?:\.\d*)?|\.\d+|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{1,2}(?:,\d{2})*,\d{3}(?:\.\d+)?)$/.test(amount)) return null;
  const parsed = Number(amount.replaceAll(',', ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export function vnnPurchaseType(vendors=[],approval={}) {
  const code=clean(approval.vendorCode).toUpperCase(),name=clean(approval.vendorName).toLowerCase();
  if(!code && !name)return '';
  const byCode = code ? vendors.filter((row) => clean(row.vendorCode).toUpperCase() === code) : [];
  const matching = byCode.length || !name ? byCode : vendors.filter((row) =>
    (!code || !clean(row.vendorCode)) && clean(row.vendorName).toLowerCase() === name);
  const types=[...new Set(matching.map(row=>clean(row.purchaseType)).filter(Boolean))];
  return types.length===1?types[0]:'';
}
