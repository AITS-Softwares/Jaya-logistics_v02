// Presentation only: never replace the original destination ID or route name.
export function destinationLabel(row, fallback = '—') {
  const remark = String(row?.locationRemark || '').trim();
  if (remark) return remark;
  const name = String(row?.toName || '').trim();
  if (name) return name;
  const to = row?.to;
  return (typeof to === 'string' && to.trim()) || fallback;
}
