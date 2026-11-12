import { destinationLabel } from './destination.mjs';

// Consolidate presentation rows only; saved billing rows retain their identity.
export function groupYaraBillingRows(rows = []) {
  const groups = new Map();
  const text = value => String(value ?? '').trim();
  const number = value => Number(value) || 0;
  rows.forEach((row, index) => {
    const invoice = text(row.invoiceNo);
    const lr = text(row.lrNo);
    const key = JSON.stringify([
      invoice, lr,
      text(destinationLabel(row, row.city || '')).toLocaleLowerCase(),
      number(row.rate), text(row.unit || 'MT').toUpperCase(),
      // Keep district subtotals and regional details accurate.
      text(row.district).toLocaleLowerCase(), text(row.state).toLocaleLowerCase(),
      // Unknown invoice/LR references must not merge unrelated shipments.
      !invoice || !lr || ['N/A', '—', '-'].includes(invoice) || ['N/A', '—', '-'].includes(lr) ? index : null,
    ]);
    if (!groups.has(key)) {
      groups.set(key, { ...row, quantity: 0, billQuantity: 0, amount: 0 });
    }
    const group = groups.get(key);
    group.quantity += number(row.quantity ?? row.weight);
    group.billQuantity += number(row.billQuantity ?? row.weight);
    group.amount += number(row.amount);
  });
  return [...groups.values()];
}
