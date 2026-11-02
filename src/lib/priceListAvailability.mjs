const id = value => String(value?._id || value || '');
export function eligiblePriceLists({rateMasters=[],branchId,customerId,locationName,rateCalculationMode,filterByLocation=false}) {
  if(rateCalculationMode==='manual_rate')return rateMasters.filter(rm=>rm.usageMode==='manual_rate_default');
  if(!id(branchId) || !id(customerId))return [];
  return rateMasters.filter(rm=>(rm.usageMode || 'standard')==='standard' && id(rm.branchId)===id(branchId) && id(rm.customerId)===id(customerId) &&
    (!filterByLocation || !locationName || rm.locationRates?.some(row=>row.locationName===locationName)));
}
export function priceListMenuPosition(rect,viewport) {
  const gap=4,padding=8;
  const below=Math.max(0,viewport.height-rect.bottom-gap-padding),above=Math.max(0,rect.top-gap-padding);
  const upwards=below<160 && above>below;
  const maxHeight=Math.min(280,upwards?above:below);
  const width=Math.min(rect.width,Math.max(0,viewport.width-padding*2));
  return {...(upwards?{bottom:viewport.height-rect.top+gap}:{top:rect.bottom+gap}),left:Math.max(padding,Math.min(rect.left,viewport.width-width-padding)),width,maxHeight};
}
export function priceListEmptyMessage({ rateMasters = [], branchId, customerId, locationName, rateCalculationMode }) {
  if (!rateMasters.length) return 'No approved active price lists were loaded. Check Rate Master approval, then refresh this page.';
  if (rateCalculationMode === 'manual_rate') return 'No approved Manual Rate Default price list is available. Check Rate Master setup.';
  if (!id(branchId)) return 'Select a branch before choosing a price list.';
  if (!id(customerId)) return 'This order has no linked customer ID. Link the customer on the source order and review the VNN before pricing.';
  const standard = rateMasters.filter(master => (master.usageMode || 'standard') === 'standard');
  const branch = standard.filter(master => id(master.branchId) === id(branchId));
  if (!branch.length) return 'No approved active price list matches this branch. Check the branch in Rate Master.';
  if (!branch.some(master => id(master.customerId) === id(customerId))) return 'No approved active price list matches this customer and branch. Check both selections in Rate Master.';
  return locationName ? `No matching price list contains location "${locationName}". Check its location slabs in Rate Master.` : 'No eligible price lists are available for this order.';
}
