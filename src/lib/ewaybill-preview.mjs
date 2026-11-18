import { createHash } from 'node:crypto';
import { ewaybillData } from './ewaybill-data.mjs';

export function buildEwaybillPayload(note, config) {
  const invoice = note.invoice?.toObject?.() || note.invoice || {};
  // JSON normalization is shared by preview and dispatch: no credentials or file bytes.
  return JSON.parse(JSON.stringify({ company: config?.erpnextCompany || '', gstin: config?.localGstin || '',
    external_id: `lr-ewaybill-${note._id}`, source_company_id: String(note.subCompanyId || ''), source_company_code: note.subCompanyCode || '', ewaybill_no: note.ewaybill?.ewaybillNo?.replace(/\s/g, ''),
    lr: { lrNo: note.lrNo, header: note.header, consignor: note.consignor, consignee: note.consignee,
      invoice: { boeInvoice: invoice.boeInvoice, boeInvoiceNo: invoice.boeInvoiceNo, boeInvoiceDate: invoice.boeInvoiceDate, invoiceValue: invoice.invoiceValue, ewaybillData: ewaybillData(invoice,note.consignor,note.consignee,note.header) }, ewaybill: { containerNo: note.ewaybill?.containerNo },
      consignmentBreakdown: note.consignmentBreakdown } }));
}

export function ewaybillPreviewToken(method, payload) {
  return createHash('sha256').update(JSON.stringify({ method: method || '', payload })).digest('hex');
}
