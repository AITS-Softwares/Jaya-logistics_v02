const key=value=>String(value?._id || value || '');
export function rateMasterForView(record,locations=[]) {
  if(!record || typeof record!=='object')return null;
  const liveRates=Array.isArray(record.locationRates)?record.locationRates.filter(Boolean):[];
  const names=new Map(liveRates.filter(row=>row.locationName).map(row=>[key(row.locationId),row.locationName]));
  for(const location of Array.isArray(locations)?locations:[])if(location?.name)names.set(key(location._id),location.name);
  const data={...record,...(record.pendingChange?.data || record.lastRejectedProposal?.data || {})};
  const rows=Array.isArray(data.locationRates)?data.locationRates.filter(row=>row && typeof row==='object'):liveRates;
  return {...data,locationRates:rows.map(row=>({...row,locationId:key(row.locationId),locationName:row.locationName || names.get(key(row.locationId)) || 'Location unavailable'}))};
}
