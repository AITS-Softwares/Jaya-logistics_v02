export const PACK_TYPES = ['PALLETIZATION', 'UNIFORM - BAGS/BOXES', 'LOOSE - CARGO', 'NON-UNIFORM - GENERAL CARGO'];

const text = (value) => String(value ?? '').trim();

export function orderSourceRevisions(record) {
  return (record?.sourceDependencies || []).filter((entry) => entry.panel === 'order')
    .map((entry) => ({ recordId: text(entry.recordId), rowId: text(entry.rowId), revision: Number(entry.revision) || 0 }))
    .sort((a, b) => `${a.recordId}:${a.rowId}`.localeCompare(`${b.recordId}:${b.rowId}`));
}

export function packProjection(record) {
  return Object.fromEntries(PACK_TYPES.map((type) => [type, (record?.packData?.[type] || []).map((row) => {
    const plain = row.toObject ? row.toObject({ depopulate: true }) : row;
    return Object.fromEntries(Object.entries(plain).filter(([key]) => key !== '_id'));
  })]));
}

// Rebuild from the approved orders for the selected drops, including empty tables
// so removed rows and changes of pack type cannot leave stale cargo behind.
export function syncPacksFromOrders(orders, child) {
  const isLoading = Array.isArray(child.orderRows);
  const targets = isLoading ? child.orderRows : [{
    orderRowId: child.orderRowId, orderNo: child.header?.orderNo,
    plantCodeValue: child.header?.plantCode, toName: child.header?.to,
  }];
  const selected = new Map();
  for (const target of targets) {
    let candidates = orders.flatMap((order) => (order.plantRows || [])
      .filter((row) => target.orderRowId
        ? text(row._id) === text(target.orderRowId)
        : text(order.orderPanelNo) === text(target.orderNo)
          && text(row.plantCodeValue || row.plantName) === text(target.plantCodeValue || target.plantName)
          && text(row.toName) === text(target.toName))
      .map((row) => ({ order, row })));
    if (candidates.length !== 1) return { ambiguous: true, matched: 0 };
    const { order, row } = candidates[0];
    const key = text(order._id);
    if (!selected.has(key)) selected.set(key, { order, rows: new Set() });
    selected.get(key).rows.add(text(row._id));
  }
  if (!selected.size) return { ambiguous: true, matched: 0 };
  const packData = Object.fromEntries(PACK_TYPES.map((type) => [type, []]));
  for (const { order, rows } of selected.values()) {
    const drops = (order.plantRows || []).filter((row) => row.toName || row.to || row.cityName || row.city);
    for (const type of PACK_TYPES) {
      for (const item of order.packData?.[type] || []) {
        const linkedId = text(item.plantRowId);
        if (linkedId ? !rows.has(linkedId) : !(drops.length === 1 && rows.has(text(drops[0]._id)))) {
          // Legacy packs without a drop link cannot be assigned safely on multi-drop orders.
          if (!linkedId && drops.length !== 1) return { ambiguous: true, matched: 0 };
          continue;
        }
        const row = item.toObject ? item.toObject({ depopulate: true }) : { ...item };
        delete row.productId;
        delete row.plantRowId;
        if (!isLoading) row.packType = type;
        packData[type].push(row);
      }
    }
  }
  child.packData = packData;
  if (isLoading) {
    const activeTypes = [...selected.values()].map(({ order }) => order.activePack).filter(Boolean);
    child.activePack = activeTypes.length && activeTypes.every((type) => type === activeTypes[0])
      ? activeTypes[0] : PACK_TYPES.find((type) => packData[type].length) || 'PALLETIZATION';
  }
  child.markModified?.('packData');
  return { ambiguous: false, matched: targets.length };
}
