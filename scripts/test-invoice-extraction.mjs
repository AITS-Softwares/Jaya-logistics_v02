import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { jsPDF } from 'jspdf';
import { extractInvoice, parseInvoicePages, applyInvoiceTaxRates } from '../src/lib/invoice-extraction.mjs';
import { ewaybillData } from '../src/lib/ewaybill-data.mjs';

const pdf = new jsPDF();
pdf.text(['GSTIN: 27AAACY4766C1Z9', 'Invoice No: TEST/2026/17', 'Invoice Date: 03.11.2026',
  'Challan No: 80051228', 'Description HSN Quantity Amount', 'Fertiliser 31026000 30 MT 1000.00',
  'IGST 5% 50.00', 'Total Invoice Value: 1050.00', 'Ewaybill No: 212323821958'], 15, 20);
const result = await extractInvoice(Buffer.from(pdf.output('arraybuffer')), 'application/pdf');
assert.equal(result.status, 'ok');
assert.deepEqual(result.invoice, { boeInvoiceNo: 'TEST/2026/17', boeInvoiceDate: '2026-11-03', invoiceValue: '1050.00' });
assert.deepEqual(result.details.hsnCodes, ['31026000']);
assert.equal(result.ewaybillNo, '212323821958');
assert.equal(result.fingerprint.length, 64);
assert.equal((await extractInvoice(Buffer.from('image'), 'image/png')).status, 'needs_ocr');
const blank = new jsPDF();
assert.equal((await extractInvoice(Buffer.from(blank.output('arraybuffer')), 'application/pdf')).status, 'needs_ocr');
await assert.rejects(extractInvoice(Buffer.from('broken'), 'application/pdf'));
assert.equal(parseInvoicePages([['Invoice No: A1', 'Grand Total: 100.00', 'Total Invoice Value: 200.00']]).invoice.invoiceValue, undefined);
assert.equal(parseInvoicePages([['Invoice No: A1', 'Total Invoice Value: 100.00']]).found, false);
assert.equal(parseInvoicePages([['Invoice Date: 31/02/2026']]).invoice.boeInvoiceDate, undefined);
const row = {description:'Goods',hsn:'31026000',quantity:1,unit:'MT',taxableValue:100};
assert.equal(applyInvoiceTaxRates([row],['IGST 5% 5.00'],{igst:5})[0].igstRate,5);
assert.equal(applyInvoiceTaxRates([row],['IGST 5.00'],{igst:5})[0].igstRate,undefined,'A tax amount is not a rate');
assert.equal(applyInvoiceTaxRates([row],['IGST 5% 5.00','IGST 12% 12.00'],{igst:17})[0].igstRate,undefined,'Conflicting printed rates are not applied globally');
assert.equal(applyInvoiceTaxRates([row],['IGST 5% 50.00'],{igst:50})[0].igstRate,undefined,'Printed rate must reconcile with the tax total');
const split = applyInvoiceTaxRates([row],['CGST 2.5% 2.50','SGST 2.5% 2.50'],{cgst:2.5,sgst:2.5});
assert.equal(split[0].cgstRate,2.5);assert.equal(split[0].sgstRate,2.5);
assert.equal(ewaybillData({extraction:{details:{items:split}}}).taxTreatment,'cgst_sgst');
const mixed = [{...row,igstRate:5},{...row,igstRate:12}];
assert.deepEqual(applyInvoiceTaxRates(mixed,[],{}).map(r=>r.igstRate),[5,12]);
assert.equal(ewaybillData({extraction:{details:{items:mixed}}}).taxTreatment,'igst');

const route = fs.readFileSync('src/app/api/consignment-note/extract-ewaybill/route.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
let reads = 0;
const endpoint = new Function('withBranchAccess', 'withAuth', 'NextResponse', 'readInvoiceFile', 'extractInvoice', `${route}\nreturn POST;`)(
  fn => fn, fn => fn, { json: (body, options) => ({ body, status: options?.status || 200 }) },
  async () => { reads++; return Buffer.from(pdf.output('arraybuffer')); }, extractInvoice);
const call = filePath => endpoint({ json: async () => ({ filePath }) });
assert.equal((await call('uploads/lr-invoice/../../secret.pdf')).status, 400);
assert.equal(reads, 0);
const uploadedPath = 'uploads/lr-invoice/12345678-1234-1234-1234-123456789abc.pdf';
const apiResult = await call(uploadedPath);
assert.equal(apiResult.body.ocr, 'ok');
assert.equal(apiResult.body.invoice.invoiceValue, '1050.00');
assert.equal(apiResult.body.extraction.sourceFilePath, uploadedPath);

// Run the same handlers the create/edit forms use, without a server or ERPNext.
const require = createRequire(import.meta.url);
const parser = require('@babel/parser');
for (const page of ['create', '[id]']) {
  const source = fs.readFileSync(`src/app/(dashboard)/admin/Consignment-Note/${page}/page.jsx`, 'utf8');
  const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
  let handler;
  const walk = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'VariableDeclarator' && node.id?.name === 'handleInvoiceFile') handler = node.init;
    for (const v of Object.values(node)) Array.isArray(v) ? v.forEach(walk) : v && typeof v === 'object' && walk(v);
  };
  walk(ast);
  let invoice = { boeInvoice: 'As Per Invoice' }, ewaybill = {}, state, response = result;
  const ref = { current: 0 };
  const scope = { invoiceScanRef: ref, setInvoice: fn => { invoice = fn(invoice); },
    setEwaybill: fn => { ewaybill = fn(ewaybill); }, setEwbScan: s => { state = s; }, setInvoiceExtractionMessage: () => {},
    localStorage: { getItem: () => 'test' }, fetch: async () => ({ ok: true, json: async () => ({ success: true, ocr: response.status, ...response, extraction: response }) }) };
  const run = new Function(...Object.keys(scope), `return ${source.slice(handler.start, handler.end)}`)(...Object.values(scope));
  await run({ filePath: 'first.pdf' });
  assert.equal(invoice.boeInvoiceNo, 'TEST/2026/17');
  assert.equal(ewaybill.status, 'Provided by Customer');
  assert.equal(state, 'found');
  invoice.boeInvoice = 'As Per Bill Of Entry'; invoice.boeInvoiceNo = 'CUSTOM-BOE';
  await run({ filePath: 'second.pdf' });
  assert.equal(invoice.boeInvoiceNo, 'CUSTOM-BOE');
  ewaybill = { ewaybillNo: '999999999999' };
  await run({ filePath: 'second.pdf' });
  assert.equal(ewaybill.ewaybillNo, '999999999999');
  response = { ...result, found: false, ewaybillNo: '' };
  ewaybill = {};
  await run({ filePath: 'without-ewb.pdf' });
  assert.equal(ewaybill.status, 'To Be Generated');
  assert.equal(state, 'notfound');
  ewaybill = { status: 'Provided by Customer', ewaybillNo: '' };
  await run({ filePath: 'without-ewb.pdf' });
  assert.equal(ewaybill.status, 'Provided by Customer', 'Re-reading must preserve a manual choice');
  ewaybill = { ewaybillNo: '999999999999' };
  await run({ filePath: 'without-ewb.pdf' });
  assert.equal(ewaybill.ewaybillNo, '999999999999');
  assert.equal(ewaybill.status, undefined, 'An existing number must not be marked for generation');
  response = { status: 'needs_ocr', warnings: ['Needs OCR'] };
  ewaybill = {};
  await run({ filePath: 'scan.pdf' });
  assert.equal(state, 'unavailable');
  assert.equal(ewaybill.status, undefined, 'Unreadable scans must not default to generation');
  await run(null);
  assert.equal(invoice.extraction, null);
  assert.equal(state, 'idle');
}

// Optional acceptance checks against the user's supplied PDFs, without committing customer data.
const expected = [
  ['SQMI/26-27/00326', '1626009.00', '', ['31059010', '31052000', '31054000', '31056000', '31026000']],
  ['IN1327004400', '1253081.90', '212323821958', ['31026000']],
];
for (const [i, file] of process.argv.slice(2).entries()) {
  const r = await extractInvoice(fs.readFileSync(file), 'application/pdf');
  assert.equal(r.invoice.boeInvoiceNo, expected[i][0]);
  assert.equal(r.invoice.boeInvoiceDate, '2026-11-03');
  assert.equal(r.invoice.invoiceValue, expected[i][1]);
  assert.equal(r.ewaybillNo, expected[i][2]);
  assert.deepEqual(r.details.hsnCodes, expected[i][3]);
  assert.equal(r.details.items.length, i === 0 ? 6 : 1);
  assert.equal(r.details.items[0].quantity, i === 0 ? 3 : 30);
  assert.equal(r.details.items[0].unit, 'MT');
  assert.equal(r.details.items[0].hsn, i === 0 ? '31059010' : '31026000');
  assert.equal(r.details.taxableValue, i === 0 ? 1548580 : 1193411.33);
  assert.equal(r.details.taxes.igst, i === 0 ? 77429 : 59670.57);
  assert(r.details.items.every(row => row.igstRate === 5));
  assert.equal(ewaybillData({extraction:r}).taxTreatment,'igst');
  assert(Math.abs(r.details.taxableValue + r.details.taxes.igst - Number(r.invoice.invoiceValue)) < 0.01);
}
console.log('PASS local PDF extraction, amounts, HSN isolation, existing EWB, OCR fallback, and create/edit auto-fill. No cloud or Frappe calls.');
