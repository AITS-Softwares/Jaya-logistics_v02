# E-way bill integration

Uses existing FRAPPE_URL, FRAPPE_API_KEY, FRAPPE_API_SECRET and operating-company mappings. Company and GSTIN come from the saved LR operating company, validated in statutory mode.

Configure server-only FRAPPE_EWAYBILL_GENERATE_METHOD and FRAPPE_EWAYBILL_FETCH_METHOD with your custom dotted ERPNext method names. If absent, the UI reports that the integration is not configured. No ERPNext method is installed by this change.

Both methods receive company, gstin, external_id (lr-ewaybill-<LR ID>), ewaybill_no and lr (lrNo, header, consignor, consignee, invoice metadata, container number, consignmentBreakdown). Validate all statutory invoice/item/tax/address fields remotely and reject incomplete input. Additional HSN/pincode/tax form fields are outside this change. Do not create accounting entries for the customer invoice.

Return { ewaybillNo: "123456789012", expiryDate: "<valid-until timestamp>", pdfBase64: "<optional PDF bytes as base64>" }. Container stays locally entered. PDF is limited to 5 MB. Remote URLs are not downloaded. Provider must enforce external_id idempotency and company access; Fetch must return the requested number.

On the create screen, Generate/Fetch/Upload automatically save the LR as a draft and stay on the same screen. Further saves update that same record; final submission remains explicit. On the edit screen, save LR changes before Generate/Fetch. PDFs are private in uploads/lr-ewaybill and referenced by LR. Only scoped authenticated endpoints serve them. Ordinary LR edits preserve document metadata; changing the number clears the previous PDF and verification. Approved/completed/rejected LRs cannot mutate e-way bills through this endpoint; use the existing edit/review process.

The number is saved before PDF storage. If the PDF is unavailable, upload it or Fetch again. An uncertain outcome blocks another Generate: reconcile in ERPNext and Fetch the resulting number. No automatic generation retry or cancellation is implemented.

Loading Info documents require complete approved LRs with invoices, Pricing and VBP/VFT/VOT/VL approval, and no pending upstream review. Staged Loading Info printing additionally requires Part 2 approval. The browser may still print any PDF it is authorised to view. E-way bill access does not record an LR print or change vehicle Out Date/Time.

Test: node scripts/test-ewaybill-documents.mjs. Live ERPNext and browser visual validation remain deployment checks.
