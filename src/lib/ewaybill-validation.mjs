// Early operator feedback. Frappe independently validates the full provider payload.
import { ewaybillData } from './ewaybill-data.mjs';
export const NIC_UNITS = 'BAG BAL BDL BKL BOU BOX BTL BUN CAN CBM CCM CMS CTN DOZ DRM GGK GMS GRS GYD KGS KLR KME LTR MLT MTR MTS NOS PAC PCS PRS QTL ROL SET SQF SQM SQY TBS TGM THD TON TUB UGS UNT YDS OTH'.split(' ');
export const EWAYBILL_TOTALS = ['totalValue', 'cgstValue', 'sgstValue', 'igstValue', 'cessValue', 'cessNonAdvolValue', 'otherValue'];
const gst = /^(?:\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[A-Z0-9]|URP)$/;
const numeric = value => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(String(value).replaceAll(',', '')));
export function validateEwaybillLr(lr, { fetchOnly = false } = {}) {
  const errors = [], invoice = lr.invoice || {}, data = invoice.ewaybillData || {};
  for (const name of ['consignor', 'consignee']) {
    const p = lr[name] || {};
    if (!p.name?.trim()) errors.push(`${name === 'consignor' ? 'Consignor' : 'Consignee'} name is required.`);
    if (!p.address?.trim()) errors.push(`${name === 'consignor' ? 'Consignor' : 'Consignee'} address is required.`);
    if (!gst.test(p.gstNumber?.trim().toUpperCase() || '')) errors.push(`${name === 'consignor' ? 'Consignor' : 'Consignee'} GSTIN/registration status is missing or invalid. Update the selected address in Customer Master and reselect it on the LR.`);
  }
  if (!invoice.boeInvoiceNo?.trim()) errors.push('Invoice number is required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(invoice.boeInvoiceDate || '') || !Number.isFinite(Date.parse(invoice.boeInvoiceDate))) errors.push('A valid invoice date is required.');
  if (!numeric(invoice.invoiceValue) || Number(String(invoice.invoiceValue).replaceAll(',', '')) <= 0) errors.push('A positive invoice value is required.');
  if (!lr.header?.vehicleNo?.trim()) errors.push('Vehicle number is required.');
  if (fetchOnly) return errors;
  if (data.docType !== 'INV' || data.transMode !== '1') errors.push('Select goods invoice and road transport in the e-way bill details.');
  for (const [key, label] of Object.entries({supplyType:'Supply direction', subSupplyType:'Supply subtype', transactionType:'Transaction type', vehicleType:'Vehicle type'})) {
    if (!data[key]) errors.push(`${label} is required.`);
  }
  for (const [prefix, label] of [['from', 'Dispatch'], ['to', 'Shipping']]) {
    if (!data[`${prefix}Addr1`]?.trim() || !data[`${prefix}Place`]?.trim()) errors.push(`${label} address and place are required.`);
    if (!/^[1-9]\d{5}$/.test(String(data[`${prefix}Pincode`] || ''))) errors.push(`${label} PIN must contain six digits.`);
    for (const [key, kind] of [[`${prefix}StateCode`,'billing'], [`act${prefix[0].toUpperCase() + prefix.slice(1)}StateCode`,'physical']]) {
      if (!Number.isInteger(Number(data[key])) || Number(data[key]) < 1 || Number(data[key]) > 38) errors.push(`${label}: ${kind} GST state code is required.`);
    }
  }
  if (!numeric(data.transDistance) || Number(data.transDistance) < 0 || Number(data.transDistance) > 4000) errors.push('Enter 0 for automatic PIN-based distance, or a distance up to 4000 km.');
  if (!Array.isArray(data.itemList) || !data.itemList.length || data.itemList.length > 250) errors.push('Add 1–250 reviewed goods rows.');
  for (const [index, row] of (Array.isArray(data.itemList) ? data.itemList : []).entries()) {
    if (!row.productDesc?.trim() || !/^(?:\d{4}|\d{6}|\d{8})$/.test(row.hsnCode || '') || !NIC_UNITS.includes(row.qtyUnit)) errors.push(`Goods row ${index + 1}: review description, HSN and NIC unit.`);
    for (const key of ['quantity', 'taxableAmount', 'cgstRate', 'sgstRate', 'igstRate', 'cessRate', 'cessNonAdvol']) {
      if (!numeric(row[key]) || Number(row[key]) < 0 || (key === 'quantity' && Number(row[key]) <= 0)) errors.push(`Goods row ${index + 1}: ${key} is required; enter zero explicitly where applicable.`);
    }
  }
  for (const key of EWAYBILL_TOTALS) if (!numeric(data[key]) || (key !== 'otherValue' && Number(data[key]) < 0)) errors.push(`Review ${key}; enter zero explicitly where applicable.`);
  return errors;
}

export function statutorySnapshot(note) {
  const invoice = note.invoice?.toObject?.() || note.invoice || {};
  const party = value => ({name: value?.name || '', address: value?.address || '', gstNumber: value?.gstNumber || '', address1:value?.address1 || '', address2:value?.address2 || '', city:value?.city || '', pinCode:value?.pinCode || '', stateCode:value?.stateCode || ''});
  return {company: String(note.subCompanyId || ''), vehicle: note.header?.vehicleNo || '', consignor: party(note.consignor), consignee: party(note.consignee),
    invoice: {number: invoice.boeInvoiceNo || '', date: invoice.boeInvoiceDate || '', value: invoice.invoiceValue || '', data: ewaybillData(invoice,note.consignor,note.consignee,note.header), file: invoice.file?.filePath || ''}};
}
