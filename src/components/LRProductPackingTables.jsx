const labels = {
  noOfPallets: 'NO OF PALLETS', unitPerPallets: 'UNIT PER PALLETS', totalPkgs: 'TOTAL PKGS', pkgsType: 'PKG TYPE',
  uom: 'UOM', skuSize: 'SKU - SIZE', packWeight: 'PACK - WEIGHT', productName: 'PRODUCT NAME', wtLtr: 'WT (LTR)',
  actualWt: 'ACTUAL - WT', chargedWt: 'CHARGED - WT', wtUom: 'WT UOM', nos: 'NOS', length: 'LENGTH', width: 'WIDTH', height: 'HEIGHT',
};
const numberFields = new Set(['noOfPallets', 'unitPerPallets', 'totalPkgs', 'packWeight', 'wtLtr', 'actualWt', 'chargedWt', 'nos', 'length', 'width', 'height']);
const hasData = row => String(row.productName || '').trim() || ['noOfPallets', 'totalPkgs', 'actualWt', 'chargedWt', 'nos'].some(key => Number(row[key]) > 0);
export default function LRProductPackingTables({ palletizationRows = [], uniformRows = [], looseCargoRows = [], nonUniformRows = [] }) {
  const groups = [
    { title: 'Palletization', rows: palletizationRows, fields: ['noOfPallets', 'unitPerPallets', 'totalPkgs', 'pkgsType', 'uom', 'skuSize', 'packWeight', 'productName', 'wtLtr', 'actualWt', 'chargedWt', 'wtUom'] },
    { title: 'Uniform - Bags/Boxes', rows: uniformRows, fields: ['totalPkgs', 'pkgsType', 'uom', 'skuSize', 'packWeight', 'productName', 'wtLtr', 'actualWt', 'chargedWt', 'wtUom'] },
    { title: 'Loose - Cargo', rows: looseCargoRows, fields: ['uom', 'productName', 'actualWt', 'chargedWt'] },
    { title: 'Non-uniform - General Cargo', rows: nonUniformRows, fields: ['nos', 'productName', 'uom', 'length', 'width', 'height', 'actualWt', 'chargedWt'] },
  ].map(group => ({ ...group, rows: group.rows.filter(hasData) })).filter(group => group.rows.length);
  return <div className="mt-4 space-y-4">{groups.length ? groups.map(({ title, rows, fields }) => <section key={title} aria-label={title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-extrabold text-slate-900">{title}</h2><span className="text-xs text-slate-500">Read only</span></div><div className="p-4"><div className="overflow-auto rounded-xl border border-yellow-300"><table className="min-w-max w-full text-sm"><thead className="bg-yellow-400"><tr>{fields.map(field => <th scope="col" key={field} className="border border-yellow-500 px-2 py-3 text-xs font-extrabold text-slate-900">{labels[field]}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row._id || index} className="even:bg-slate-50 hover:bg-yellow-50">{fields.map(field => <td key={field} className={`border border-yellow-300 px-2 py-2 text-slate-700 ${numberFields.has(field) ? 'text-right tabular-nums' : field === 'productName' ? 'font-medium' : 'text-center'}`}>{row[field] === null || row[field] === undefined || row[field] === '' ? '—' : String(row[field])}</td>)}</tr>)}</tbody></table></div></div></section>) : <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No product packing details available for this LR.</section>}</div>;
}
