import { createHash } from 'node:crypto';
import { parseDate, parseEwaybill } from './parseEwaybill.js';

// Keep coordinates: joining PDF strings in storage order mixes adjacent addresses.
export async function readPdfLines(buffer) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, isEvalSupported: false });
  const doc = await task.promise;
  try {
    if (doc.numPages > 30) throw new Error('Invoices must contain at most 30 pages.');
    const pages = [];
    const items = [];
    for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
      const page = await doc.getPage(pageNo);
      const content = await page.getTextContent();
      items.push(...extractTableItems(content.items));
      const rows = [];
      for (const item of content.items.filter(i => i.str?.trim())) {
        const y = item.transform[5];
        let row = rows.find(r => Math.abs(r.y - y) < 2.5);
        if (!row) rows.push(row = { y, cells: [] });
        row.cells.push({ x: item.transform[4], text: item.str });
      }
      pages.push(rows.sort((a, b) => b.y - a.y).map(r => r.cells.sort((a, b) => a.x - b.x).map(c => c.text).join(' ')));
      page.cleanup();
    }
    return { pages, items };
  } finally { await doc.destroy(); }
}

const money = s => {
  const n = Number(String(s || '').replace(/[₹,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};

// Match table headings by position, then collect wrapped text inside each item row.
// Unknown layouts remain in the evidence panel instead of inventing column values.
function extractTableItems(tokens) {
  const cells = tokens.filter(t => t.str?.trim()).map(t => ({ text: t.str.trim(), x: t.transform[4], y: t.transform[5], width: t.width }));
  const heading = cells.find(c => /^HSN(?:\s*\/|\s+Code|$)/i.test(c.text));
  if (!heading) return [];
  const headers = cells.filter(c => Math.abs(c.y - heading.y) < 3).sort((a, b) => a.x - b.x);
  const description = headers.find(c => /^Description$/i.test(c.text));
  if (!description || !headers.some(c => /^Qty\.?$/i.test(c.text))) return [];
  const centres = headers.map(c => ({ ...c, centre: c.x + c.width / 2 }));
  const column = cell => {
    const centre = cell.x + cell.width / 2;
    return centres.reduce((best, h) => Math.abs(h.centre - centre) < Math.abs(best.centre - centre) ? h : best).text;
  };
  const anchors = cells.filter(c => c.y < heading.y - 20 && /^\d{1,3}$/.test(c.text) && c.x < headers[1].x - 3).sort((a, b) => b.y - a.y);
  return anchors.flatMap((anchor, index) => {
    const top = index ? (anchors[index - 1].y + anchor.y) / 2 : heading.y - 20;
    const footer = cells.filter(c => c.y < anchor.y && c.x < heading.x && /^(?:IGST|CGST|SGST|Total Tax Amount|Total Invoice|Net Amount|Contact:)/i.test(c.text)).sort((a, b) => b.y - a.y)[0];
    const bottom = index < anchors.length - 1 ? (anchor.y + anchors[index + 1].y) / 2 : (footer?.y ?? 0) + 1;
    const row = cells.filter(c => c.y < top && c.y > bottom).sort((a, b) => b.y - a.y || a.x - b.x);
    const values = new Map();
    for (const c of row) { const key = column(c); values.set(key, [...(values.get(key) || []), c.text]); }
    const get = pattern => [...values].filter(([key]) => pattern.test(key)).flatMap(([, v]) => v).join(' ');
    const hsn = get(/^HSN/i).match(/\b\d{4,8}\b/)?.[0];
    if (!hsn) return [];
    const quantityText = get(/^Qty/i);
    const quantityNumbers = quantityText.match(/\d+(?:\.\d+)?/g);
    const unit = (get(/^Unit$/i) || quantityText).match(/\b(?:MT|KG|KGS|NOS|PCS|LTR|TON)\b/i)?.[0];
    const amount = get(/^Taxable$/i) || get(/^Amount$/i) || get(/^Total$/i);
    const taxableValue = amount ? money(amount) : null;
    const descriptionText = get(/^Description$/i).replace(/\s+/g, ' ').trim();
    const taxRates = explicitTaxRates(get(/^Tax$/i));
    return [{ description: descriptionText, hsn, quantity: quantityNumbers ? Number(quantityNumbers.at(-1)) : null,
      unit: unit || '', taxableValue, taxAmount: get(/^Tax Amount$/i) ? money(get(/^Tax Amount$/i)) : null, ...taxRates }];
  });
}

// Only labeled percentages count as rates. An amount or an unlabeled number
// beside a tax name must never become a percentage.
function explicitTaxRates(text) {
  const result = {};
  for (const type of ['IGST','CGST','SGST']) {
    const values = [...String(text || '').replace(/₹/g, '').matchAll(new RegExp(`\\b${type}\\s*(?:@|:)?\\s*(\\d+(?:\\.\\d+)?)\\s*%`, 'gi'))].map(m => Number(m[1]));
    const unique = [...new Set(values)];
    if (unique.length === 1 && unique[0] >= 0 && unique[0] <= 100) result[`${type.toLowerCase()}Rate`] = unique[0];
  }
  return result;
}

export function applyInvoiceTaxRates(items, taxLines, totals = {}) {
  // Invoice-wide rates apply only when explicitly printed on a tax-total line
  // and supported by the corresponding total; no blended rate calculation.
  const rates = explicitTaxRates(taxLines.filter(l => /^\s*(?:IGST|CGST|SGST)\b/i.test(l)).join('\n'));
  return items.map(item => {
    const row = {...item};
    for (const [key, rate] of Object.entries(rates)) {
      const type = key.replace('Rate','');
      if (row[key] != null || totals[type] == null || !items.every(r => r.taxableValue != null && (r[key] == null || r[key] === rate))) continue;
      const computed = items.reduce((sum,r) => sum + Math.round(r.taxableValue * rate) / 100,0);
      if (Math.abs(computed - totals[type]) <= .02) row[key] = rate;
    }
    return row;
  });
}

export function parseInvoicePages(pages) {
  const lines = pages.flat();
  const text = lines.join('\n');
  const warnings = [];
  const number = text.match(/\b(?:inv(?:oice)?\s*(?:no\.?|number)|tax\s+invoice)\s*[:#]\s*([A-Z0-9][A-Z0-9/._-]*)/i)?.[1] || '';
  let date = '';
  for (let i = 0; i < lines.length && !date; i++) {
    const m = lines[i].match(/\binv(?:oice)?\s*date\s*:?\s*(.*)/i);
    if (m) date = parseDate(m[1]) || parseDate(lines[i + 1] || '');
  }
  if (date && (Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) date = '';
  const totals = [];
  for (let i = 0; i < lines.length; i++) {
    if (/\b(?:total\s+(?:invoice\s+value|amount)|grand\s+total)\s*:/i.test(lines[i]) || /\btotal\s*\(tax\s+rounded/i.test(lines[i])) {
      let segment = lines[i];
      if (/\btotal\s*\(tax\s+rounded/i.test(segment)) segment += ' ' + (lines[i + 1] || '');
      const found = [...segment.matchAll(/(?:₹\s*)?(\d[\d,]*\.\s*\d{1,2})(?!\d)/g)];
      if (found.length) totals.push(money(found.at(-1)[1]));
    }
  }
  const distinctTotals = [...new Set(totals.filter(n => n > 0))];
  const total = distinctTotals.length === 1 ? distinctTotals[0] : null;
  if (distinctTotals.length > 1) warnings.push('Conflicting invoice totals: check the invoice value.');
  const gstins = [...new Set(text.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[A-Z0-9]\b/g) || [])];
  // Preserve line evidence rather than guessing item/tax columns in an unknown layout.
  const tableStart = lines.findIndex(l => /\b(?:description|material code)\b/i.test(l));
  const goodsLines = tableStart < 0 ? [] : lines.slice(tableStart + 1).filter(l => /\b\d{8}\b/.test(l) && !/IRN|acknowledg|account|invoice|challan/i.test(l));
  const hsnCodes = [...new Set(goodsLines.map(l => l.match(/\b\d{8}\b/)?.[0]).filter(Boolean))];
  const ewaybill = parseEwaybill(text);
  if (!number) warnings.push('Invoice number was not identified.');
  if (!date) warnings.push('Invoice date was not identified.');
  if (total === null) warnings.push('Invoice total was not identified reliably.');
  warnings.push('Check supplier, bill-to, ship-to and dispatch addresses before statutory generation.');
  return {
    invoice: { ...(number && { boeInvoiceNo: number }), ...(date && { boeInvoiceDate: date }), ...(total !== null && { invoiceValue: total.toFixed(2) }) },
    ...ewaybill,
    details: { gstins, hsnCodes, goodsLines, taxLines: lines.filter(l => /\b(?:IGST|CGST|SGST)\b/i.test(l)),
      addressLines: lines.slice(0, lines.findIndex(l => /\b(?:description|material code)\b/i.test(l)) > 0 ? lines.findIndex(l => /\b(?:description|material code)\b/i.test(l)) : 35) },
    warnings,
  };
}

export async function extractInvoice(buffer, mimeType) {
  const fingerprint = createHash('sha256').update(buffer).digest('hex');
  if (mimeType !== 'application/pdf') return { status: 'needs_ocr', fingerprint, warnings: ['Image invoices need OCR. Automatic filling is available for text PDFs; enter or check these details manually.'] };
  const { pages, items } = await readPdfLines(buffer);
  if (pages.flat().join('').trim().length < 50) return { status: 'needs_ocr', fingerprint, warnings: ['This PDF appears to be scanned and needs OCR. Invoice fields have not been guessed.'] };
  const parsed = parseInvoicePages(pages);
  // Invoice-level tax totals only; a rate is never treated as an amount.
  parsed.details.taxes = Object.fromEntries(['IGST', 'CGST', 'SGST'].flatMap(type => {
    const amounts = parsed.details.taxLines.filter(l => new RegExp(`^${type}\\b`, 'i').test(l)).map(l => l.replace(/\d+(?:\.\d+)?\s*%/g, '').match(/(?:₹\s*)?([\d,]+\.\d{2})(?!\d)/)?.[1]).filter(Boolean).map(money);
    return amounts.length === 1 ? [[type.toLowerCase(), amounts[0]]] : [];
  }));
  parsed.details.items = applyInvoiceTaxRates(items,parsed.details.taxLines,parsed.details.taxes);
  if (items.length && items.every(i => i.taxableValue !== null)) parsed.details.taxableValue = Number(items.reduce((sum, item) => sum + item.taxableValue, 0).toFixed(2));
  return { status: 'ok', fingerprint, pageCount: pages.length, ...parsed };
}
