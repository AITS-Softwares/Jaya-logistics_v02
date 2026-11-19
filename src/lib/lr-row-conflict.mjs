export function lrRowConflict(note) {
  const draft = Boolean(note.isDraft || note.header?.status === 'Draft');
  return {
    success:false,code:'ORDER_ROW_LR_EXISTS',
    message:`${draft ? 'Draft LR' : 'LR'} ${note.lrNo || ''} already exists for this order row. Open the existing ${draft ? 'draft' : 'LR'} to continue; another LR cannot be created for the same row.`,
    existingNote:{id:String(note._id),lrNo:note.lrNo || '',isDraft:draft},
  };
}
export function isOrderRowDuplicate(error) {
  return error?.code === 11000 && (Boolean(error.keyPattern?.orderRowId) || /companyId_1_orderRowId_1/.test(error.message || ''));
}
