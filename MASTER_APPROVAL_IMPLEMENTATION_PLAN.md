# Supplier and Rate Master approval implementation plan

Status: master-only implementation written; see MASTER_APPROVAL_SETUP.md for scope, validation limits and manual migration. This historical specification is narrowed by the user's subsequent instruction: change Supplier and Rate Master only; do not change Payment or other transaction panels.

Current scope overrides: all supplier create/edit changes require review; existing approved values remain available while proposals wait. No payment snapshot or transaction API changes are included. Operational visibility is enforced by the two master models' approved-only reads. Database migration is supplied for manual execution and has not been run.

Scope: Supplier and Rate Master only. Location Master keeps its existing create/edit workflow without approval.

You are working on the Jaya Global Logistics ERP (Next.js App Router, MongoDB/Mongoose, JavaScript). Add a maker-checker approval flow to the Supplier master and the Rate Master. Do NOT add it to the Location master. Make minimal, surgical changes and follow the existing code style. Do not touch commented-out code. Before writing code, list every file you will change and why. Ask me before making any assumption that changes the behavior of existing transactions.

## 1. Files involved
- Supplier: src/models/SupplierModels.js, src/app/api/suppliers/route.js, src/app/api/suppliers/[id]/route.js, src/app/api/suppliers/bulk/route.js, src/app/api/suppliers/search/route.js, src/app/api/suppliers/lookup/route.js, src/app/api/suppliers/by-code/[code]/route.js, src/app/api/checkSupplierCode/route.js, src/app/api/lastSupplierCode/route.js, src/components/SupplierManagement.jsx, src/components/SupplierSearch.jsx, src/app/(dashboard)/admin/supplier/page.jsx
- Rate Master: src/app/api/rate-master/schema.js, history-schema.js, route.js, cleanup/route.js, and the pages under src/app/(dashboard)/admin/rate-master/ (create, edit/[id], list, rates/[id])
- Downstream readers of Rate Master: src/app/api/pricing-panel/reference-data/route.js, src/app/api/pricing-panel/route.js
- Downstream readers of Supplier: Advance-Payment, balance-payment, purchase-order, purchase-quotation, purchaseInvoice, grn, vehicle-negotiation, pod-panel acknowledgement and email APIs, DebitNoteModel
- Permissions: src/lib/masterPermissionRegistry.js (Suppliers and Rate Master already include "approve" and "reject"), src/lib/masterDataPermission.js
- Notifications: notifyModulePermissionUsers in src/lib/workflowNotifications
- Existing Mongo-session patterns: src/app/api/reapproval/[type]/[id]/route.js

## 2. Naming rules (important)
- RateMaster already has `approvalOption` (contract_rate / mail_approval) and `approvalFile`. They record how the CUSTOMER approved the rate. Do not rename or reuse them for the internal workflow.
- Supplier already has `valid`, which is the Udyam check result. Do not reuse it.
- Use new fields: approvalStatus, pendingChange, revisionId, and so on.

## 3. Data model (add to both Supplier and RateMaster)
- approvalStatus: enum ['Pending', 'Approved', 'Rejected'], default 'Pending'
- submittedBy, approvedBy, rejectedBy: each { accountType: 'company' | 'companyUser', accountId: ObjectId } (the app has both Company accounts and CompanyUser accounts, so a plain ref to CompanyUser is not enough)
- submittedAt, approvedAt, rejectedAt: Date
- rejectionReason: String
- pendingChange: null or { revisionId, baseVersion, data: Object, requestedBy: { accountType, accountId }, requestedAt }
- lastRejectedProposal: null or { data, reason, rejectedBy, rejectedAt } (used to prefill the edit form after a rejection)
- approvalLog: array of { action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED' | 'GRANDFATHERED', revisionId, by: { accountType, accountId }, at, remark, changedFields }
For Rate Master you may reuse RateHistory for rate-level history, but the approvalLog is still required.

## 4. Core rules
1. The live record stays usable while a change waits for approval. Sensitive edits are saved only into pendingChange and are NOT applied to the live fields until approved. Editing an Approved record never sets it back to Pending.
2. A brand-new record starts as 'Pending' and cannot be selected or used anywhere downstream until it is 'Approved'.
3. Maker is not checker. The submitter of a record or change cannot approve or reject it. Compare BOTH accountType and accountId. Company accounts and Admin role are NOT exempt. Enforce this on the server.
4. Approve and reject require the "approve" / "reject" permission for "Suppliers" or "Rate Master" through canUseMasterPermission. Create and edit permission only allows submitting.
5. Approval is revision-specific. Every submission gets a new revisionId and records baseVersion (a dedicated approvalVersion integer; never updatedAt). Approve and reject take { revisionId } and must match atomically (a findOneAndUpdate whose filter includes the revisionId and baseVersion). On mismatch return: "This proposal changed or the record was updated. Refresh before reviewing."
6. Do not silently overwrite a pending proposal. If a pending proposal exists, a different user cannot replace it (return a clear message naming who submitted it). The same maker can replace their own proposal, which creates a new revisionId and logs the old one as SUPERSEDED. The checker screen must always show who submitted the current revision.
7. Approving applies pendingChange.data to the live fields in one atomic operation, sets approvedBy/approvedAt, clears pendingChange, and writes the log entry.
8. Rejection requires a reason (see section 8).

## 5. Which edits need approval
Supplier, approval required: supplierName, supplierCode, pan, gstNumber, gstCategory, bankName, branch, bankAccountNumber, ifscCode, glAccount, dueDays, paymentTerms, and the supporting documents that substantiate bank/tax details (documents.panCard, documents.cancelledCheque, documents.tdsDeclaration). Documents that support a bank or tax change must travel inside that same proposal, not change independently.
Supplier, applies immediately: contact person, mobile, email, contact numbers, addresses, visiting card, aadhaar card, leadTime, qualityRating, supplierType/Group/Category.
Rate Master, approval required: any change to locationRates (rate, fromQty, toQty, adding or removing a location row, isActive), weightRule and custom rule fields, customerId, branchId, usageMode, approvalOption, and approvalFile (the customer's approval evidence is part of what justifies the rate, so it goes in the same proposal).
Rate Master, applies immediately: title only.
Only create a pendingChange if the submitted sensitive values actually differ from the live ones.

## 6. API changes
Supplier:
- POST /api/suppliers: create with approvalStatus 'Pending'.
- PUT in suppliers/route.js and suppliers/[id]/route.js: REPLACE the `{ ...data }` spread with an explicit allow-list. Never accept approvalStatus, approvedBy, rejectedBy, pendingChange, revisionId, approvalLog and similar from the request body. Split the body into immediate fields (apply now) and sensitive fields (go to pendingChange).
- New endpoints: POST /api/suppliers/[id]/approve and POST /api/suppliers/[id]/reject (body: { revisionId, reason }).
- /api/suppliers/bulk: new rows are created as 'Pending'. For existing rows, sensitive-field changes go to pendingChange. Return a per-row result: "created pending", "updated", or "change pending approval".
- GET list: support ?approvalStatus= filter; return hasPendingChange and the submitter of the pending change.
- search, lookup, by-code and every supplier dropdown (Advance Payment, Balance Payment, Purchase Panel, Purchase Quotation/Order/Invoice, Vehicle Negotiation, Debit Notes): return only suppliers with approvalStatus 'Approved', and always the live values, never pendingChange.
- checkSupplierCode and lastSupplierCode must still count Pending and Rejected records so codes stay unique.

Rate Master:
- POST: create as 'Pending'.
- PUT: same immediate vs pending split. Keep the existing RateHistory and per-rate version logic, but only bump versions and write REVISED history rows when the change is APPROVED, not when it is submitted.
- New approve and reject endpoints with the same rules.
- GET: return approvalStatus, hasPendingChange and the pending proposal so the edit page can show it next to the live values.
- /api/rate-master/cleanup: first read what it does (it appears to deactivate live rate rows and write history immediately). Tell me what you found, then route it through the same approval flow so it cannot change an Approved record's live rates directly.
- /api/pricing-panel/reference-data and /api/pricing-panel: only use rate masters with approvalStatus 'Approved' and their live locationRates. Pricing records already saved against an earlier rate must not change.

## 7. Server-side enforcement downstream (not just dropdowns)
Hiding records in dropdowns is not enough, because callers can post IDs directly. The create/update APIs of purchase-order, purchase-quotation, purchaseInvoice, grn, vehicle-negotiation, Advance-Payment, balance-payment and pricing-panel must reject a supplier or rate master whose approvalStatus is not 'Approved', when a supplier or rate is being newly set or changed on a record. Existing saved transactions keep their stored values and references and must keep working.

## 8. Reject behavior
- Reject always requires a reason.
- Rejected NEW record: stays on the same document with approvalStatus 'Rejected' and the reason shown. The maker edits that same record and clicks Resubmit, which returns it to 'Pending'. Never require creating a new record (Rate Master has a unique index on company+title and suppliers have unique codes, so a new record would also hit duplicate errors and split the history).
- Rejected CHANGE to an Approved record: the live record is unchanged. The proposal is removed from pendingChange, saved in lastRejectedProposal, and kept in approvalLog with the reason.
- The Edit screen must prefill from lastRejectedProposal and show the rejection reason at the top, so the maker can correct and resubmit a new revision without retyping. For Rate Master, show the rejected slabs next to the live ones.

## 9. Payment beneficiary rule
Do not let an approved supplier bank change silently redirect payments that are already queued. FIRST inspect how Advance-Payment and balance-payment APIs and pages read supplier bank details today, and report back whether they snapshot or read live. Then implement: snapshot bankName, bankAccountNumber and ifscCode onto the Advance/Balance Payment record when it is queued, so an approved bank change applies only to payments queued after the approval. Show a visible warning on a queued payment if the supplier's live bank details have since changed.

## 10. Transactions and notifications
- Approve and reject must run in a Mongo session (follow the pattern in src/app/api/reapproval/[type]/[id]/route.js) so the master update, rate version bumps, RateHistory rows and approvalLog entry commit together or not at all.
- Send notifications (notifyModulePermissionUsers) only AFTER the commit. A notification failure must not fail or roll back the approval. Notify users with approve permission on submission, and notify the submitter on approval or rejection.

## 11. Migration
Write a one-off, idempotent script in src/scripts/ (same style as migrate-jgl-operating-company.mjs):
- Set approvalStatus = 'Approved' ONLY on Supplier and RateMaster documents where approvalStatus is missing. Never overwrite 'Pending' or 'Rejected' on reruns.
- Add an approvalLog entry with action 'GRANDFATHERED' and no approver (do not imply a person reviewed them).
- Print counts of documents updated and skipped.
- Must be run BEFORE the filtered lookups and server-side checks are deployed, otherwise every supplier and rate dropdown becomes empty.

## 12. UI
- Supplier list and Rate Master list: status badge (Pending / Approved / Rejected), a "Change pending" indicator, and a status filter. Reuse existing styling in SupplierManagement.jsx and the rate-master pages. Do not redesign them.
- After saving an edit where sensitive fields went to pending, show: "Your changes to bank/tax details were sent for approval. The current approved values stay in use until then."
- A "Pending Approvals" view per master, visible to users with approve OR reject permission (each action still requires its own permission): show who submitted it, when, and a field-by-field diff (old vs new). Approve and Reject (reason required) buttons are hidden or disabled for the submitter. If the revision changed while the checker had it open, show the refresh message from rule 5.

## 13. Edge cases to handle
- Supplier or rate master deleted while a change is pending: discard the pending change.
- Approve or reject clicked twice or by two users at once: the second call fails cleanly with a message.
- Suppliers already referenced by Advance/Balance Payment queues and Rate Masters already referenced by pricing records keep working after approval changes.
- Location master is untouched except that its existing create/edit permissions continue to apply.

## 14. Required corrections and project-specific decisions

These rules resolve ambiguities in the sections above and take precedence where needed.

### Scope and authority
- Location Master has NO new approval workflow. Its routes, model, pages and existing create/edit permissions remain unchanged.
- Approval goes to users assigned Approve for the specific master, plus Company/Admin accounts under the existing permission policy. Reject is separately permission-controlled.
- Company/Admin access never overrides maker-checker separation. Normalize the actual staff token type `user` to the persisted identity label `companyUser`; do not compare raw token labels inconsistently.
- Apply tenant scope and current account/permission checks on every submission, review and lookup. Pending financial proposals must not appear in transactional lookup responses.

### Revision lifecycle
- Add approvalVersion (default 0) on the live document. Immediate contact/title edits do not increment it. Approval of sensitive changes increments it atomically.
- New Pending and resubmitted Rejected records also need a current revisionId, baseVersion and submittedBy, independent of pendingChange. Review endpoints must handle initial approval and change approval explicitly.
- Use compare-and-swap for submission/replacement as well as approval/rejection. Two simultaneous submissions must not overwrite one another. Match the observed current revision or its absence.
- A same-maker replacement supersedes the prior revision; another maker receives a conflict. Never silently drop any proposal.
- Store a complete proposed sensitive state or a field-level patch with explicit deletion semantics. Omitted fields must not erase live values. Nested supporting documents need explicit allow-lists.
- Validate proposed values before storing and again before approval. Do not apply an unrestricted Mixed object directly to the live document.
- Check proposed supplier codes/titles against tenant uniqueness at submission and approval. Pending JSON is not covered by the live field unique index. Preserve the existing code reservation policy and handle duplicate-key conflicts without partially approving.
- Rejected proposal prefill is offered to an authorized editor and labelled clearly. Do not automatically merge an old rejected proposal over a newer active proposal.

### Additional write paths found in this project
- Supplier POST currently calls syncSupplier immediately after save. A new Pending supplier must not sync to Frappe. Sync only approved live values, after commit, with failure recorded for retry. Never send pending bank/tax values to Frappe.
- Inventory every supplier write path, including bulk and both PUT routes. Apply explicit create/edit permissions; the root supplier PUT currently calls its validation helper without the edit action.
- Rate Master DELETE with rateId currently removes a live slab and writes history. Route individual slab deletion through approval, just like cleanup and slab edits. Checking only PUT is insufficient.
- Whole-master deletion must follow existing deletion/reference safeguards, atomically clear any proposal and retain the audit trail. Do not invent a new physical-delete path.
- Rate cleanup currently finds duplicate active location/fromQty/toQty slabs, writes DELETED history and deactivates the duplicates. Submission must only propose this result. Write the history and actual slab changes at approval within the same session.
- Keep the existing per-slab revision/deactivation semantics when approving a rate edit. Pass the Mongo session explicitly to every master/history write.

### Payment beneficiary snapshots
- Advance and Balance Payment currently contain fallback reads from Supplier for missing bank fields. Do not treat these as proof that every queued payment already has a trustworthy snapshot.
- Inspect the actual queue transition and payment execution/export paths before choosing the snapshot point. Snapshot from the approved tenant-scoped Supplier on the server, not from browser-supplied vendorDetails.
- Store the supplier identity, bank name, account number, IFSC and capture time. Once queued, payment execution must use the snapshot and must not refill blank snapshot fields from the live supplier.
- Existing queued payments without snapshots require an explicit migration/review policy. Do not silently copy today's changed bank details into old payment instructions. Until verified, block their payment execution with an actionable message.
- A bank-change warning compares the live supplier to the snapshot but does not modify the beneficiary.

### Read and downstream validation rules
- Management lists may show Pending/Rejected records to authorized master users. Transaction lookups return only approved live fields and omit proposals/logs/rejected payloads.
- Existing saved transactions must remain readable even if a referenced master is no longer selectable. Do not globally filter population queries used to render historical documents.
- Validate unapproved references whenever newly set or changed, including nested/bulk inputs. An unchanged reference is not an excuse to recalculate a saved transaction using unapproved live inputs.
- Do not expose full bank details in generic changedFields notifications or module-wide payloads.

### Notifications
- Notify currently authorized reviewers after submission commits. Notify the actual submitter after approval/rejection using accountType plus accountId.
- Catch notification errors outside the transaction. Persist/report delivery failures without undoing a committed master action. Do not send external messages while testing.

### Migration and release
- Migration must use raw collection operations (or an equivalent method that does not materialize Mongoose defaults before checking missing fields). Only documents with approvalStatus truly absent are grandfathered.
- Atomically set Approved and append an audit entry with action `GRANDFATHERED` in the same per-document update.
- Include dry-run and explicit target database selection. Invalid/null/unrecognized statuses are reported for review, not silently grandfathered.
- Pause affected writes during the deployment window: take and verify a backup, run the missing-only migration, verify counts, deploy approval-enforcing code and smoke-test, then resume writes. No unprotected old-code writes may occur between migration and activation.
- Do not execute migration or alter the main database as part of local implementation.

### Required verification additions
- Concurrent first submissions and same-maker replacements; stale rejection as well as stale approval; immediate title/contact edit while proposal waits.
- Initial approval, rejected-new resubmission, tenant isolation, disabled reviewer and forged approval metadata.
- Direct slab DELETE, cleanup, bulk, by-code lookup, Frappe sync and notification failure paths.
- Transaction rollback leaves live values, version, rate history and audit unchanged.
- Existing queued payment with missing beneficiary snapshot cannot silently use the new live bank details.
- Location Master create/edit behavior remains unchanged.

## 15. Deliverables
1. The file list with reasons (before any code).
2. A report on cleanup/route.js and on how payments read supplier bank details (sections 6 and 9), before changing them.
3. The code changes, file by file, as diffs or full replacements.
4. The migration script.
5. A manual test checklist covering: create new (pending, not selectable), approve, reject new and resubmit, edit sensitive field and reject (live unchanged, prefilled form), edit non-sensitive field (immediate), maker approving own change (must fail), a company-account maker approving own change (must fail), stale revision approval (must fail), a different user replacing someone's pending proposal (must fail), bulk upload, direct API post of an unapproved supplier/rate ID (must be rejected), queued payment beneficiary unchanged after a bank approval, pricing panel using only approved rates, migration rerun not overwriting Pending/Rejected.