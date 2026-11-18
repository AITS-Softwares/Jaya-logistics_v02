export function displayInvoiceDate(value = '') {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : value;
}

export function invoiceDateIso(value = '') {
  const match = value.match(/^(\d{2})[/.\s-](\d{2})[/.\s-](\d{4})$/);
  if (!match) return '';
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : '';
}
