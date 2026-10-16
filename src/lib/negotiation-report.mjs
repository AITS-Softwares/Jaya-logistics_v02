const positive=value=>Number.isFinite(Number(value)) && Number(value)>0 ? Number(value) : null;
export function negotiationRows(records){return records.map(record=>{
 const approval=record.approval || {},workflow=record.workflow || {},negotiation=record.negotiation || {};
 const basis=approval.rateType || '',final=basis==='Per MT' ? positive(approval.finalPerMT) : basis==='Fixed' ? positive(approval.finalFix) : null;
 return {id:String(record._id),number:record.vnnNo || '—',date:record.date,branch:record.branchName || '—',company:record.subCompanyName || record.subCompanyCode || '—',party:record.partyName || record.customerName || record.orders?.find(row=>row.partyName)?.partyName || '—',weight:positive(record.totalWeight),target:positive(negotiation.targetRate),maxRate:positive(negotiation.maxRate),targetPurchaseType:negotiation.purchaseType || '',purchaseType:approval.purchaseType || '',basis,final,vendor:approval.vendorName || 'Not selected',vehicle:approval.vehicleNo || 'Not placed',part1:approval.part1Status || 'Pending',part3:approval.part3Status || 'Pending',locked:Boolean(workflow.part1Locked),targetComplete:Boolean(workflow.rateTargetCompletedAt),placed:Boolean(workflow.placementCompletedAt),routes:(record.orders || []).map(row=>({order:row.orderNo || '',from:row.fromName || '',to:row.toName || ''})),quotes:(record.vendors || []).map(row=>({vendor:row.vendorName || '—',purchaseType:row.purchaseType || '',rate:positive(row.marketRate)})),remarks:negotiation.remarks1 || ''};
});}
export function compareNegotiation(row,targetBasis=''){
 let reason='';
 if(!targetBasis)reason='Confirm target rate basis';
 else if(!row.targetComplete)reason='Target not completed';
 else if(row.part3==='Reject' || row.part1==='Reject')reason='Rejected negotiation';
 else if(targetBasis!==row.basis)reason='Different rate bases';
 else if(!row.target || !row.final)reason='Target or final rate missing';
 else if(!row.targetPurchaseType || !row.purchaseType || row.targetPurchaseType!==row.purchaseType)reason='Purchase scopes do not match';
 else if(targetBasis==='Per MT' && !row.weight)reason='Weight missing';
 if(reason)return {comparable:false,reason,rateDifference:null,costDifference:null};
 const rateDifference=row.final-row.target;
 return {comparable:true,reason:rateDifference>0?'Above target':rateDifference<0?'Below target':'At target',rateDifference,costDifference:rateDifference*(targetBasis==='Per MT'?row.weight:1)};
}
