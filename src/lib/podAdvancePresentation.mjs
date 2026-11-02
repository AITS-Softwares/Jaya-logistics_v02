export function podAdvanceMessage(info) {
  if(info?.error)return 'Unable to load advance payment. Refresh and try again.';
  if(!info?.loaded)return 'Loading advance payment...';
  const payments=info.payments || [];
  if(!info.found)return 'No submitted Advance Payment found for this purchase. Draft advances are not counted.';
  const pending=payments.filter(payment=>!payment.counted && !['Paid','Completed'].includes(payment.status));
  const paid=payments.filter(payment=>['Paid','Completed'].includes(payment.status));
  const queued=payments.filter(payment=>payment.counted && payment.viaQueue && !['Paid','Completed'].includes(payment.status));
  const describe=payment=>`${payment.paymentNo || 'Advance Payment'} (${payment.status || 'Pending'}${payment.viaQueue?', queue generated':''})`;
  const unpaidMessage=pending.length?`Not included yet: ${pending.map(describe).join(', ')}. Generate the advance payment queue to include it.`:'';
  return [paid.length?`Paid advance from ${paid.map(payment=>payment.paymentNo).join(', ')}.`:'',queued.length?`Advance included from generated queue: ${queued.map(describe).join(', ')}.`:'',unpaidMessage].filter(Boolean).join(' ') || 'No queued or paid advance is available for this purchase.';
}
