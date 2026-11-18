# E-way bill integration

Implemented 17 November 2026. Frappe app source lives in the sibling repository `D:/Work/jaya_integration_v01`; see its [README](../jaya_integration_v01/README.md). No live ERPNext calls or deployment have been performed.

## Workflow

Save draft LR -> validate required details -> prepare/preview persistent Frappe request -> explicitly confirm -> generate -> persist number and validity -> retrieve/attach PDF. Fetch verifies a customer-provided bill or recovers an existing result/print. Both operations use the company saved on the LR.

Create uses Create Draft & Continue to save one draft and open its Edit page. ERPNext Preview, Generate, Fetch, status and PDF controls exist only on saved LR pages; they never create or autosave an LR. On Edit, save corrections before Preview/Fetch, then explicitly Submit for Approval when ready. The existing E-waybill & Container Details card now shows mapped invoice products and only the extra movement/address/tax inputs needed for generation. `src/lib/ewaybill-data.mjs` maps identified goods, units, totals and selected customer address metadata; both preview and dispatch use the same mapping. Missing item tax rates are not guessed; explicit tax/cess choices can supply non-applicable zero values. Customer-provided bills show products and verification fields without requiring the generation-only form. Missing consignor/consignee, invoice, addresses, goods or transport data blocks generation. Frappe independently validates the complete payload.

## Server configuration

```ini
FRAPPE_URL=https://YOUR_SITE
FRAPPE_API_KEY=<integration user key>
FRAPPE_API_SECRET=<integration user secret>
FRAPPE_EWAYBILL_PREVIEW_METHOD=jaya_integration.api.ewaybill.preview
FRAPPE_EWAYBILL_GENERATE_METHOD=jaya_integration.api.ewaybill.generate
FRAPPE_EWAYBILL_FETCH_METHOD=jaya_integration.api.ewaybill.fetch
FRAPPE_EWAYBILL_STATUS_METHOD=jaya_integration.api.ewaybill.status
FRAPPE_EWAYBILL_ENABLED=false
```

Generation requires the global flag true, the saved operating company's `FRAPPE_OPERATING_COMPANY_MAP` entry enabled, and its Frappe `Jaya Integration Company` mapping's Allow Generation enabled. Fetch is not disabled by the generation switches. No actual environment files were changed by implementation.

Company count is dynamic: every admin-added operating company needs a legal profile, ERPNext Company/GST address, provider credentials, matching Next.js map entry, Frappe mapping and integration-user access. There is no fallback company or GSTIN. API credentials stay server-side; GSP credentials stay in GST Settings.

## Contracts and recovery

Common request arguments: company, gstin, source_company_id, source_company_code, external_id (`lr-ewaybill-<Mongo LR ID>`) and lr. Preview returns requestName, preparedVersion, warnings and the provider payload. Generate additionally requires the prepared_version approved in the server-stored preview; Fetch additionally requires ewaybill_no. The Next.js server validates its local token and rejects a changed LR before dispatch.

Results contain ewaybillNo, expiryDate, requestName and optional pdfBase64; otherwise pdfPending. Frappe and Next.js persist the statutory number before attempting PDF storage. Files are private and limited to 5 MB. Fetch is available after generation to retry missing PDFs.

Uncertain generation blocks another Generate. Inspect the restricted ERPNext provider log, obtain the actual bill number, save that number and Fetch to reconcile. Interrupted Processing requests can be reconciled after two minutes. Invoice, company, parties, goods and vehicle edits are blocked after a generated/uncertain result; active Processing also blocks edits. No automatic regeneration, blind reset, cancellation or statutory amendment flow is implemented.

First-release scope: domestic road supply against goods invoices, transaction types 1-4, registered parties or explicit URP, full Part B vehicle/validity. Import/export, other movement reasons/documents and Part A-only need extensions. Original invoice bytes are not copied to Frappe.

Loading Info's existing document/view/print approval gates remain in place.

## Checks

```bash
node scripts/test-ewaybill-documents.mjs
node scripts/test-ewaybill-create.mjs
node scripts/test-ewaybill-preview-ui.mjs
node scripts/test-invoice-extraction.mjs
python ../jaya_integration_v01/tests/test_ewaybill_offline.py
```

Offline checks do not establish live provider access, real Frappe migration/permission behaviour, or PDF renderer availability. Those remain deployment checks. India Compliance source compatibility was checked against 15.31.4; target Frappe is 15.120.1 and ERPNext 15.121.2.

Mapping regression check: `node scripts/test-ewaybill-data-mapping.mjs`.

Recovery fixes: Next.js checks the locked Frappe request state after a failed Generate. Only Draft/Ready clears the local uncertainty marker and invalidates the old confirmation. Issued results can be recovered from persisted metadata; Processing/Uncertain or unavailable status stays blocked. The Check ERPNext status action also handles previously stuck requests without saving the form or calling Generate. Fetch failures restore the previous local state. Frappe refreshes editable draft snapshots before Fetch, validates sandbox distance during Preview, and returns positive provider distance for storage/display on the LR.
