# ERPNext Accounting and Compliance Integration

**Status:** Local, uncommitted foundation in progress — no production behavior changed.
**Working rule:** This document and all future ERPNext integration work remain local and uncommitted. Do not stage, commit, push, reset, or stash unrelated work.

## Change ledger

| Date | File | Change | Rollback |
| --- | --- | --- | --- |
| 2026-10-26 | `output/ERPNext_ACCOUNTING_INTEGRATION_PLAN_AND_CHANGE_LOG.md` | Created the implementation plan and change ledger; recorded the foundation work below. | Delete this file. |
| 2026-10-26 | `src/lib/frappe-client.mjs` | Added a server-only, HTTPS-only ERPNext client with timeout, redacted errors, REST helpers, submit helper, and idempotent external-ID lookup. Corrected token-style error redaction after a mocked safety test. No live request is made automatically. | Delete this file. |
| 2026-10-26 | `src/models/ErpNextSyncLog.js` | Added an additive Mongo audit/outbox model with company/legal-entity scope, retry-safe idempotency, status history, and sanitized summaries. | Delete this file. |
| 2026-10-26 | `src/lib/erpnext-sync-log.mjs` | Added local helpers to create, complete, fail, reconcile, and read sync attempts. It has no external HTTP calls. | Delete this file. |
| 2026-10-27 | `src/lib/frappe-company-config.mjs` | Added a metadata-only, explicit map from local operating-company code to ERPNext Company, GSTIN, Cost Center, and default Warehouse. It rejects credentials/URLs in the map, rejects GSTIN mismatches, and requires both a global and per-company feature flag before a future accounting/statutory export can run. | Delete this file. |
| 2026-10-27 | `src/app/api/erpnext/preflight/route.js` | Added a read-only readiness endpoint for the active local legal company. It masks GSTINs, exposes no secret or endpoint, and never contacts ERPNext or writes data. | Delete this file. |
| 2026-10-27 | `src/models/SalesInvoice.js`, `src/app/api/sales-invoice/route.js`, `src/app/api/sales-invoice/[id]/route.js`, `src/app/(dashboard)/admin/sales-invoice-view/new/page.jsx` | Added legal-company ownership and ERPNext reference placeholders to new Sales Invoices; scoped list/read/edit/delete to the active legal company; protected server-owned legal/ERP fields; restored authenticated edit loading and multipart attachment handling. No ERPNext invoice is created. | Revert only these four files. |
| 2026-10-27 | `src/models/InvoiceModel.js`, `src/app/api/purchaseInvoice/route.js`, `src/app/api/purchaseInvoice/[id]/route.js`, `src/app/(dashboard)/admin/purchaseInvoice-view/[id]/page.jsx` | Added legal-company ownership and ERPNext reference placeholders to Purchase Invoices; scoped read/create/update and linked GRN/PO lookup; restored authenticated detail loading. No ERPNext purchase invoice is created. | Revert only these four files. |
| 2026-10-27 | `src/models/Payment.js`, `src/app/api/payment/route.js` | Added legal-company ownership and ERPNext Payment Entry placeholders. Payment allocation now validates amount, party, duplicate references, invoice balance, and selected-company access inside one local transaction. No ERPNext Payment Entry is created. | Revert only these two files. |

**Verification:** syntax checks passed for the ERPNext configuration/preflight, Sales Invoice, Purchase Invoice, and Payment server routes/models. Mocked ERPNext-client success, configuration-rejection, company-map, and error-redaction tests passed. `git diff --check` passed (only normal Windows line-ending warnings were printed). A repository-wide production build was started but stalled before completion and was stopped; it is therefore not recorded as a passing build. No production or sandbox ERPNext request, Mongo data write, or statutory-document action was run.

### Protected existing work

The following already-staged driver-guide files are outside this initiative and must not be touched by ERPNext work:

- `create_driver_app_guide_pdf.py`
- `output/pdf/Jaya_Logistics_Driver_App_Quick_Guide.pdf`
- `tmp/pdfs/contact.png`
- `tmp/pdfs/guide-1.png`
- `tmp/pdfs/guide-2.png`
- `tmp/pdfs/guide-3.png`
- `tmp/pdfs/guide-4.png`

For every implementation step, add its exact modified-file list and verification result to the table above. No secrets, API keys, customer data, or ERP responses may be logged here.

### Exact rollback boundary

This initiative consists only of the exact files named in the change ledger, including the new untracked ERPNext files and the listed modified application files. It does not include the protected staged driver-guide files. To discard this initiative later, revert or remove only the named ERPNext files through the Git UI or file explorer; do not use a broad clean/reset command because the working tree contains unrelated staged driver-guide work.

## Goal

Use this application as the operational UI and ERPNext as the accounting and statutory-compliance system of record. The application sends approved business data to ERPNext; ERPNext creates and submits accounting vouchers, ledger entries, e-Invoices, and e-Way Bills. This UI displays ERPNext status and documents.

## Approved multi-company design

Use **one live ERPNext site** with a separate ERPNext **Company** for each local legal entity that has its own books/GSTIN: `JGL`, `JL`, and `NK`. Optionally create `JAYA GROUP` as a non-posting parent Company for consolidation only. It must never issue an invoice, receive a payment, or generate an e-Invoice/e-Way Bill.

| Data type | Ownership rule |
| --- | --- |
| Common masters | Keep one shared Customer, Supplier, Item, UOM, Item Group, address/contact, and HSN/SAC master where the business policy allows it. |
| Company defaults | Maintain receivable/payable accounts, income/expense accounts, tax templates, Cost Centers, Warehouses, bank/cash accounts, payment settings, opening balances, and GST settings per ERPNext Company. |
| Transactions | Every Sales Invoice, Purchase Invoice, Payment Entry, Journal Entry, e-Invoice, and e-Way Bill carries exactly one local `subCompanyId` and maps to exactly one ERPNext Company/GSTIN. Never fall back to the parent tenant for financial or statutory posting. |
| Internal business | Use ERPNext's inter-company process and dedicated internal Customer/Supplier mapping; do not mix one company's ledger into another company's invoice. |

The code enforces this with `FRAPPE_OPERATING_COMPANY_MAP`. Keep it metadata-only and disabled until the pilot. Example (use real approved values only when ready; do not copy credentials here):

```text
FRAPPE_ACCOUNTING_SYNC_ENABLED=false
FRAPPE_OPERATING_COMPANY_MAP={"JGL":{"erpnextCompany":"<exact ERPNext Company>","gstin":"<JGL GSTIN>","localSubCompanyId":"<local id>","costCenter":"<ERPNext Cost Center>","defaultWarehouse":"<ERPNext Warehouse>","enabled":false},"JL":{"erpnextCompany":"<exact ERPNext Company>","gstin":"<JL GSTIN>","enabled":false},"NK":{"erpnextCompany":"<exact ERPNext Company>","gstin":"<NK GSTIN>","enabled":false}}
```

## Current project position

- Customer and Item already have server-side, one-way Frappe sync helpers.
- Sales Invoice, Purchase Invoice, Payment, Supplier, Account Head, Bank Head, Warehouse, and local Journal Entry are not integrated with ERPNext.
- The Finance menu currently links directly to ERPNext; the local Journal Entry page is presently UI-only.
- Existing Frappe credentials stay server-only in environment configuration. They must never be sent to a browser.

## Current implementation progress

Phase 1 is now **started, not enabled**. The reusable client, local audit/outbox foundation, legal-company mapping gate, and read-only readiness check exist. Sales Invoice, Purchase Invoice, and Payment records now retain the active legal-company identity and have safe ERPNext reference placeholders. No Customer, Item, Sales Invoice, Purchase Invoice, Payment, Loading/LR, or Journal Entry flow calls ERPNext yet. This is intentional: the live ERPNext site must not receive financial or statutory submissions until the correct ERPNext Company/GSTIN mapping has passed a controlled pilot.

## Implementation plan

### Phase 0 — Verify ERPNext readiness

1. Confirm the target ERPNext company, fiscal year, currency, GSTIN, company address, warehouses, and branch/cost-center structure.
2. Confirm India Compliance is installed and configured: GST API access, e-Invoice, e-Way Bill, tax accounts/templates, HSN/SAC, and eligible GSTINs.
3. The configured ERPNext site is live. Create a least-privilege integration user and test with draft/non-statutory records or a controlled test company on that same site before enabling financial submission.
4. Record the approved mapping decisions: local company to ERPNext Company, local branch to Cost Center, local warehouse to ERPNext Warehouse, and local account/ledger to ERPNext Account.

### Phase 1 — Build a safe integration foundation

1. Replace separate Customer and Item HTTP code with one shared, server-only Frappe client.
2. Add a durable local sync record for every exported document: local model/id, ERPNext doctype/name, state, idempotency key, request attempt time, response summary, error, and last reconciliation time.
3. Use a retry-safe external ID on ERPNext records. A retry must find/update the existing ERPNext document, never duplicate it.
4. Add a manual retry and a status-refresh action; do not silently retry financial submission indefinitely.
5. Add strict validation before any ERPNext call and show users an actionable list of missing data.

### Phase 2 — Synchronize masters in dependency order

1. Company, company address, fiscal setup, branches, and Cost Centers.
2. Chart of Accounts, bank/cash accounts, Modes of Payment, and payment terms.
3. UOM, Item Group, HSN/SAC, tax templates, Warehouses, and price lists.
4. Customers and Suppliers, including billing/shipping addresses, GSTIN, PAN, and receivable/payable defaults.
5. Items and item prices.

ERPNext must own the financial defaults such as receivable account, payable account, tax account, and income/expense account. The local app stores the ERPNext reference and shows it; it does not invent accounting entries.

### Phase 3 — Send approved business vouchers to ERPNext

1. **Sales flow:** approved local Sales Invoice creates/updates an ERPNext Sales Invoice. Submit only after the local approval and validation gates pass.
2. **Purchase flow:** approved Purchase Invoice creates/updates an ERPNext Purchase Invoice.
3. **Payment flow:** an approved local payment creates an ERPNext Payment Entry against the corresponding ERPNext invoice(s).
4. **Journal flow:** replace the UI-only Journal Entry save action with a validated ERPNext Journal Entry. Use it only for genuine manual adjustments, not for normal invoice or payment posting.
5. **Corrections:** use ERPNext Credit Note, Debit Note, cancellation, and amendment flows. Do not edit a submitted statutory or accounting document directly.

When ERPNext submits a Sales Invoice, Purchase Invoice, Payment Entry, or Journal Entry, ERPNext creates the General Ledger entries. This project must never post raw GL lines as a duplicate accounting system.

### Phase 4 — Add e-Invoice and e-Way Bill

1. Create and submit the ERPNext Sales Invoice from the final local Sales Invoice.
2. Generate the e-Invoice in ERPNext only after invoice data is final. Save/display IRN, acknowledgement details, QR code, PDF/link, status, and failure reason locally.
3. Generate the e-Way Bill from the linked ERPNext Sales Invoice after Loading/LR confirms vehicle, transporter, source/destination PIN codes, transport mode, distance, and dispatch data.
4. Display document states in this app: `Not ready`, `Ready`, `Generating`, `Generated`, `Failed`, `Cancelled`.
5. Support safe refresh, retry, cancellation, and vehicle-update actions through ERPNext, with a local audit trail.

### Phase 5 — Display, reconcile, and operate

1. Add an ERPNext panel to Customer, Item, Sales Invoice, Purchase Invoice, Payment, Loading/LR, and Journal Entry screens.
2. Show ERPNext document number, submission status, modified time, PDF/print link, compliance numbers, and a retry/status action where appropriate.
3. Add a Finance reconciliation screen that compares local record state with ERPNext state and identifies failures or stale records.
4. Read ERPNext reports (trial balance, receivables, payables, GST/compliance status) into this UI as read-only views where needed.

### Phase 6 — Test and release safely

1. Test every flow in ERPNext sandbox/test company first: intra-state sale, inter-state sale, GST/non-GST customer, invoice failure, retry, payment allocation, credit/debit note, e-Invoice, e-Way Bill, cancellation, and vehicle update.
2. Verify that repeated clicks/retries do not create duplicate ERPNext records.
3. Pilot with a single operating company and a small finance team.
4. Reconcile the pilot period with ERPNext ledgers before enabling all companies.

## Where each function belongs

| Local area | Role in the final process |
| --- | --- |
| Pricing Panel | Supplies approved rates and charges only; no statutory generation. |
| Sales Invoice | Final commercial/tax invoice; starts ERPNext Sales Invoice and e-Invoice generation. |
| Loading Info / LR | Supplies finalized dispatch, vehicle, route, weight, consignor/consignee data; starts e-Way Bill generation. |
| Payment screens | Create ERPNext Payment Entry after approval. |
| Finance / Journal Entry | Create ERPNext Journal Entry only for authorized adjustments. |

## Initial implementation order for this codebase

1. Shared Frappe client and sync/audit model.
2. Improve the existing Customer and Item integration to use the new foundation.
3. Add Supplier, UOM, Warehouse, Account/Bank, tax-template, and payment-term mappings.
4. Add Sales Invoice synchronization and status display.
5. Add Loading/LR-based e-Way Bill and Sales-Invoice-based e-Invoice controls.
6. Add Purchase Invoice, Payment Entry, and Journal Entry integration.
7. Add reconciliation/report views.

## Required business confirmations before production submission

- Exact ERPNext Company name per operating company.
- Whether local Sales Invoice should map to ERPNext Sales Invoice directly or through a Delivery Note first.
- Which local fields map to ERPNext Cost Center, Warehouse, income/expense accounts, tax templates, and payment accounts.
- The organization’s approval authority for submitting, cancelling, or retrying accounting and statutory documents.
- Exact ERPNext Company name and GSTIN for `JGL`, `JL`, and `NK` (the site is confirmed live/production-bound).
