// Shared by the form, preview and dispatch. Only explicit/identified values fill gaps.
import { gstStateCode } from './gst-states.mjs';
const present = value => value !== undefined && value !== null && value !== '';
const first = (...values) => values.find(present) ?? '';
const amount = value => present(value) && Number.isFinite(Number(value)) ? Number(value) : null;
export const nicUnit = value => ({ KG:'KGS', MT:'MTS', TON:'TON', LTR:'LTR', PCS:'PCS', NOS:'NOS' }[String(value || '').toUpperCase()] || String(value || '').toUpperCase());
const normalized = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function addressPartyFields(address = {}) {
  return {address1:address.address1 || '',address2:address.address2 || '',city:address.city || '',pinCode:address.pinCode || address.pin || '',state:address.state || '',stateCode:gstStateCode(address.stateCode) || gstStateCode(address.state) || '',gstNumber:address.gstNumber || ''};
}
export function resolveParty(party, customers = []) {
  const names = !party.customerId && party.name ? customers.filter(c => normalized(c.customerName) === normalized(party.name)) : [];
  const customer = customers.find(c => party.customerId && String(c._id) === String(party.customerId)) || (names.length === 1 ? names[0] : null);
  if (!customer) return party;
  const addresses = [...(customer.billingAddresses || []).map((a,i) => ({...a,title:a.title || `Billing Address ${i+1}`})),...(customer.shippingAddresses || []).map((a,i) => ({...a,title:a.title || `Shipping Address ${i+1}`}))];
  const format = a => `${a.address1 || ''} ${a.address2 || ''} ${a.city || ''} ${a.state || ''} ${a.pin || ''}`;
  const scoped = party.selectedAddressTitle ? addresses.filter(a => a.title === party.selectedAddressTitle) : addresses;
  const exact = scoped.filter(a => normalized(format(a)) === normalized(party.address));
  // Legacy LR addresses may omit the state or use commas/newlines. Require
  // all of street, city and PIN to agree; never select an arbitrary first row.
  const compatible = scoped.filter(a => [a.address1,a.city,a.pin].every(v => normalized(v) && ` ${normalized(party.address)} `.includes(` ${normalized(v)} `)));
  const selected = exact.length === 1 ? exact[0] : exact.length === 0 && compatible.length === 1 ? compatible[0] : null;
  // Match the saved address, not merely the customer's first GST registration.
  const gstNumber = party.gstNumber || selected?.gstNumber || (addresses.length === 0 ? customer.gstNumber : '') || '';
  const next = {...party,customerId:party.customerId || String(customer._id),gstNumber};
  if (selected) Object.assign(next,{...addressPartyFields(selected),gstNumber,stateCode:gstStateCode(selected.stateCode) || gstStateCode(selected.state) || (selected.gstNumber?.match(/^\d{2}/)?.[0]) || ''});
  return JSON.stringify(next) === JSON.stringify(party) ? party : next;
}
export function ewaybillData(invoice = {}, consignor = {}, consignee = {}, header = {}) {
  const extracted = invoice.extraction?.details || {}, saved = invoice.ewaybillData || {};
  const data = { docType: invoice.boeInvoice === 'As Per Invoice' || !invoice.boeInvoice ? 'INV' : '', transMode:'1', ...saved };
  data.transDistance = saved.transDistance ?? 0; // NIC calculates distance from PINs when explicitly sent zero.
  data.itemList = saved.itemList ?? (extracted.items || []).map(row => ({ productDesc:row.description || '', hsnCode:row.hsn || '', quantity:row.quantity ?? '', qtyUnit:nicUnit(row.unit), taxableAmount:row.taxableValue ?? '', cgstRate:row.cgstRate ?? '', sgstRate:row.sgstRate ?? '', igstRate:row.igstRate ?? '', cessRate:row.cessRate ?? '', cessNonAdvol:row.cessNonAdvol ?? '' }));
  // Refresh previously saved rows only when they uniquely match the same goods.
  data.itemList = data.itemList.map(row => {
    const matches = (extracted.items || []).filter(r => String(r.hsn) === String(row.hsnCode) && r.description === row.productDesc && Number(r.quantity) === Number(row.quantity) && Number(r.taxableValue) === Number(row.taxableAmount));
    const next = {...row};
    if (matches.length === 1) for (const key of ['igstRate','cgstRate','sgstRate']) if (!present(next[key]) && present(matches[0][key])) next[key] = matches[0][key];
    return next;
  });
  const every = test => data.itemList.length > 0 && data.itemList.every(test);
  data.taxTreatment = first(saved.taxTreatment,
    every(r => present(r.igstRate) && !Number(r.cgstRate) && !Number(r.sgstRate)) ? 'igst' :
    every(r => present(r.cgstRate) && present(r.sgstRate) && !Number(r.igstRate)) ? 'cgst_sgst' : '');
  data.itemList = data.itemList.map(row => {
    const next = {...row};
    if (data.taxTreatment === 'igst') { next.cgstRate = 0; next.sgstRate = 0; }
    if (data.taxTreatment === 'cgst_sgst') next.igstRate = 0;
    if (data.taxTreatment === 'none') { next.cgstRate = 0; next.sgstRate = 0; next.igstRate = 0; }
    if (saved.noCess === true) { next.cessRate = 0; next.cessNonAdvol = 0; }
    return next;
  });
  const total = (valueKey, rateKey) => data.itemList.length && data.itemList.every(r => amount(r[valueKey]) !== null && (!rateKey || amount(r[rateKey]) !== null))
    ? Math.round(data.itemList.reduce((sum,r) => sum + Number(r[valueKey]) * (rateKey ? Number(r[rateKey]) / (rateKey === 'cessNonAdvol' ? 1 : 100) : 1),0) * 100) / 100 : '';
  data.totalValue = first(saved.totalValue, extracted.taxableValue, total('taxableAmount'));
  for (const [key, tax, rate] of [['cgstValue','cgst','cgstRate'],['sgstValue','sgst','sgstRate'],['igstValue','igst','igstRate'],['cessValue','cess','cessRate']]) data[key] = first(saved[key], extracted.taxes?.[tax], total('taxableAmount',rate));
  data.cessNonAdvolValue = first(saved.cessNonAdvolValue,total('quantity','cessNonAdvol'));
  data.transDocNo = first(saved.transDocNo,header.lrNo);
  data.transDocDate = first(saved.transDocDate,header.lrDate?.slice(0,10));
  for (const [prefix, party] of [['from',consignor],['to',consignee]]) {
    const gst = party.gstNumber?.trim().toUpperCase();
    data[`${prefix}StateCode`] = first(saved[`${prefix}StateCode`], /^\d{2}[A-Z]/.test(gst || '') ? gst.slice(0,2) : '',party.stateCode,gstStateCode(party.state));
    const sameAddress = prefix === 'from' ? ['1','2'].includes(String(saved.transactionType)) : ['1','3'].includes(String(saved.transactionType));
    if (sameAddress) {
      const pins = [...new Set((party.address || '').match(/\b[1-9]\d{5}\b/g) || [])];
      data[`${prefix}Addr1`] = first(saved[`${prefix}Addr1`],party.address1,party.address);
      data[`${prefix}Addr2`] = first(saved[`${prefix}Addr2`],party.address2);
      data[`${prefix}Place`] = first(saved[`${prefix}Place`],party.city);
      data[`${prefix}Pincode`] = first(saved[`${prefix}Pincode`],party.pinCode,pins.length === 1 ? pins[0] : '');
      data[`act${prefix === 'from' ? 'From' : 'To'}StateCode`] = first(saved[`act${prefix === 'from' ? 'From' : 'To'}StateCode`],party.stateCode,gstStateCode(party.state),data[`${prefix}StateCode`]);
    }
  }
  return data;
}
