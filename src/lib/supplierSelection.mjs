// Older suppliers predate status; the schema treats their missing status as Active.
// Apply this only to selection APIs, never to historical document readers.
export function supplierSelectionFilter() {
  return {approvalStatus:'Approved',$and:[{$or:[{status:'Active'},{status:{$exists:false}}]}]};
}
