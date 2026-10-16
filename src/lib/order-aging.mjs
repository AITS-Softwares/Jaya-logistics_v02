export const buckets = ['0–2 days', '3–7 days', '8–15 days', '16–30 days', '>30 days'];
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
function day(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const get = type => Number(parts.find(part => part.type === type).value);
  return Date.UTC(get('year'), get('month') - 1, get('day')) / 86400000;
}
export function buildAging(orders, asOf = new Date()) {
  const today = day(asOf);
  return orders.map(order => {
    const routes = order.plantRows || [];
    const packing = Object.entries(order.packData || {}).flatMap(([type, rows]) => (Array.isArray(rows) ? rows : []).map(row => ({...row, packType:type})));
    const date = day(order.date);
    const age = date === null ? null : Math.max(0, today - date);
    const status = order.panelStatus || 'Unknown';
    const open = !['completed','closed','cancelled','rejected'].includes(status.toLowerCase());
    return {id:String(order._id),orderNo:order.orderPanelNo || '—',date:order.date,branch:order.branchName || '—',company:order.subCompanyName || order.subCompanyCode || '—',party:order.partyName || order.customerName || '—',delivery:order.delivery || '—',status,open,age:open ? age : null,bucket:!open || age === null ? null : age <= 2 ? 0 : age <= 7 ? 1 : age <= 15 ? 2 : age <= 30 ? 3 : 4,packages:packing.reduce((sum,row)=>sum+number(row.totalPkgs ?? row.nos),0),updatedAt:order.updatedAt,routes,packing};
  }).sort((a,b)=>(b.age ?? -1)-(a.age ?? -1));
}
