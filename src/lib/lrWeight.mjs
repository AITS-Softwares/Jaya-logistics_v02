const PACK_TYPES = ['PALLETIZATION', 'UNIFORM - BAGS/BOXES', 'LOOSE - CARGO', 'NON-UNIFORM - GENERAL CARGO'];

// Match the edit/details page: the LR cargo weight is the sum of its pack rows,
// independent of the full Order weight and its originally planned drop weight.
export function getLrCargoWeight(note) {
  const rows = PACK_TYPES.flatMap((type) => note.packData?.[type] || []);
  const hasWeight = rows.some((row) => row.actualWt !== '' && row.actualWt !== null && row.actualWt !== undefined);
  return hasWeight
    ? Math.round(rows.reduce((sum, row) => sum + (Number(row.actualWt) || 0), 0) * 1000) / 1000
    : Number(note.totalWeight) || 0;
}

export function withLrCargoWeight(breakdown, note) {
  // A single-drop LR has one independently known weight. Legacy multi-order
  // splits cannot be reallocated without pack-to-order links, so retain them.
  return breakdown.length === 1
    ? [{ ...(breakdown[0].toObject?.() || breakdown[0]), weight: getLrCargoWeight(note) }]
    : breakdown;
}
