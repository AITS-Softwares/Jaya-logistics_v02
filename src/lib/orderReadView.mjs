export const ORDER_VIEW_SELECT = 'orderPanelNo date branchName branchCode subCompanyName subCompanyCode customerName customerCode partyName delivery loadingInfoPhotosOptional plantRows packData allocationEnabled totalWeight panelStatus approvalRemarks approvedAt createdAt updatedAt reapprovalState';

const pick = (object, keys) => Object.fromEntries(keys.filter(key => object?.[key] !== undefined).map(key => [key, object[key]]));
export function orderReadView(order) {
  const result = pick(order, ORDER_VIEW_SELECT.split(' ').filter(key => !['plantRows', 'packData', 'contactPerson'].includes(key)));
  result._id = String(order._id);
  result.plantRows = (order.plantRows || []).map(row => ({
    ...pick(row, ['_id', 'plantName', 'plantCodeValue', 'orderType', 'pinCode', 'fromName', 'fromState', 'toName', 'locationRemark', 'cityName', 'talukaName', 'districtName', 'stateName', 'countryName', 'weight', 'status', 'statusReason', 'statusChangedAt', 'holdUntil', 'localStatusLabel']),
    statusRequest: pick(row.statusRequest, ['action', 'reason', 'at']),
    statusHistory: (row.statusHistory || []).map(entry => pick(entry, ['action', 'from', 'to', 'reason', 'at'])),
  }));
  result.packData = Object.fromEntries(Object.entries(order.packData || {}).filter(([, rows]) => Array.isArray(rows)).map(([type, rows]) => [type, rows.map(row => pick(row, ['_id', 'plantRowId', 'productName', 'noOfPallets', 'unitPerPallets', 'totalPkgs', 'pkgsType', 'uom', 'skuSize', 'packWeight', 'wtLtr', 'actualWt', 'wtUom', 'nos', 'length', 'width', 'height']))]));
  return result;
}
