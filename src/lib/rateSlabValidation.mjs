const locationKey=row=>String(row.locationId?._id || row.locationId || '');
const rowKey=row=>JSON.stringify([locationKey(row),Number(row.fromQty),Number(row.toQty),Number(row.rate)]);
const pairKey=(a,b)=>JSON.stringify([rowKey(a),rowKey(b)].sort());
function overlapPairs(rows) {
  const groups=new Map(),pairs=[];
  for(const row of rows || []) {
    if(row.isActive===false)continue;
    const key=locationKey(row),group=groups.get(key) || [];
    for(const previous of group) {
      if(Number(row.fromQty)<Number(previous.toQty) && Number(row.toQty)>Number(previous.fromQty)) pairs.push({a:previous,b:row,key:pairKey(previous,row)});
    }
    group.push(row);groups.set(key,group);
  }
  return pairs;
}
// Existing overlaps may remain unchanged during an unrelated addition. Count
// pairs, rather than using a Set, so another duplicate cannot be smuggled in.
export function findNewRateOverlap(rows,baseline=[]) {
  const allowance=new Map();
  for(const pair of overlapPairs(baseline))allowance.set(pair.key,(allowance.get(pair.key)||0)+1);
  for(const pair of overlapPairs(rows)) {
    const remaining=allowance.get(pair.key)||0;
    if(remaining)allowance.set(pair.key,remaining-1);
    else return pair;
  }
  return null;
}
export function rateOverlapMessage(conflict) {
  const {a,b}=conflict;
  const location=a.locationName || b.locationName || 'the selected location';
  return `The quantity range ${b.fromQty}–${b.toQty} overlaps with ${a.fromQty}–${a.toQty} for ${location}. Edit the existing slab to revise its rate, or enter a non-overlapping range.`;
}
