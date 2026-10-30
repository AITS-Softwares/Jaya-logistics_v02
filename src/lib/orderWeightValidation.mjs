// Shared by the order forms and API. Blank draft weights and zero are allowed.
export function validateOrderWeights({ plantRows = [], packData = {}, packRows = [] } = {}) {
  for (const [index, row] of plantRows.entries()) {
    if (Number(row.weight) < 0) {
      return `Order row ${index + 1}: weight cannot be negative.`;
    }
  }

  const rows = [...packRows, ...Object.values(packData || {}).flat()];
  for (const row of rows) {
    if (['packWeight', 'wtLtr', 'actualWt', 'chargedWt'].some(key => Number(row[key]) < 0)) {
      return 'Pack weights cannot be negative. Please correct the Pack Type table.';
    }
  }
  return '';
}
