export const inputClass = 'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-yellow-500 disabled:bg-slate-100 disabled:text-slate-500';
export const countPacked = (order, status) => order.items.filter(item => item.packedStatus === status).length;
export const dateLabel = value => value ? new Date(value).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }) : '—';
export function Badge({ children, tone = 'slate' }) {
  const colors = { green: 'bg-green-100 text-green-800', yellow: 'bg-yellow-100 text-yellow-800', red: 'bg-red-100 text-red-800', slate: 'bg-slate-100 text-slate-600' };
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${colors[tone]}`}>{children}</span>;
}
export function PackingSummary({ order, badges = false }) {
  const values = [['Fully Packed', badges ? 'Fully' : 'Full', 'green'], ['Partially Packed', 'Partial', 'yellow'], ['Not Packed', 'Not', 'red']];
  if (badges) return <div className="flex flex-wrap gap-2 text-xs font-bold">{values.map(([status, label, tone]) => <span key={status} className={`rounded-full px-2 py-1 ${tone === 'green' ? 'bg-green-100 text-green-800' : tone === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{countPacked(order, status)} {label}</span>)}<span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{order.items.filter(item => !item.packedStatus).length} Pending</span></div>;
  return <span className="text-xs text-slate-600"><b className="text-green-700">{countPacked(order, 'Fully Packed')} Full</b> · <b className="text-yellow-700">{countPacked(order, 'Partially Packed')} Partial</b> · <b className="text-red-700">{countPacked(order, 'Not Packed')} Not</b> <span className="text-slate-400">of {order.items.length}</span></span>;
}
