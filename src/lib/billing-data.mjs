export const billingTypes=['product-wise','general','detention','cancellation','other'];
export const numeric=value=>Number.isFinite(Number(value)) ? Number(value) : 0;
export function billingRows(reports, allowedIds=null) {
  let withheld=0;
  const rows=[];
  for(const report of reports) {
    const items=Array.isArray(report.data) ? report.data : [];
    // Saved bills have no company stamp. Require every source consignment to
    // match the selected company; never split a bill or expose another company.
    if(allowedIds && (!items.length || items.some(item=>!allowedIds.has(String(item._id || '').split('_')[0])))) {withheld++;continue;}
    rows.push({id:String(report._id),reference:report.reportId,type:report.type,date:report.generatedAt,customer:report.filters?.clientName || 'Not supplied',branch:report.filters?.branchName || 'Not supplied',amount:report.summary?.totalAmount==null ? items.reduce((sum,item)=>sum+numeric(item.amount),0) : numeric(report.summary.totalAmount),items:items.map(item=>({lrNo:item.lrNo || '—',party:item.partyName || '',from:item.from || '',to:item.to || '',product:item.productName || '',vehicle:item.vehicleNo || '',amount:numeric(item.amount)}))});
  }
  return {rows,withheld};
}
