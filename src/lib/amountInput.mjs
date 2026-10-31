// Keep empty and decimal input editable while removing redundant leading zeros.
export function normalizeAmountInput(value) {
  return value == null ? '' : String(value).replace(/^(-?)0+(?=\d)/, '$1');
}
