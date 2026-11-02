# Cancellation, correction and LR controls

Order cancellation now plans the direct and indirect linked workflow inside a
MongoDB transaction. Paid/completed advances, recorded PODs and paid/completed
balance payments block the operation. Approved Loading Info, approved LRs and
uploaded invoices do not block it. Documents and issued bills remain available;
billed LRs receive an adjustment-review notification.

Records used only by cancelled orders are cancelled. Shared records retain
their other orders, mark affected rows and block normal progression. Their
editors can request correction; approvers/admins can open a correction to remove
cancelled rows and resubmit the remaining work. Cancelling that unlock restores
the previous cancellation-review state. Fully cancelled records cannot unlock.

Orders cancelled before this change reconcile automatically when Order, VNN,
Pricing, Loading Info or LR data is opened. The scoped batch runs at most once
per five seconds, processes 25 records at a time and skips completed repairs.
No manual repair button is required. If historical paid advances, POD or paid
balances prevent a repair, linked operational records are blocked for review
and approvers receive the reason; financial/POD records are preserved.

Pricing has a separate cancellation-charge form in the approval-status area.
Editors enter explicit non-negative amounts (including zero) and submit;
Pricing Part 2 approvers/admins approve or return them. Outstanding flags clear
only after approval. Freight/commercial fields remain protected.

LR creation, draft submission and the order dropdown do not require Pricing
approval. Loading Part 2 approval remains required. In Loading Info, LR and
invoice View/Print require approved linked Pricing for every order, without
draft, cancellation, correction or upstream-review state. The shared server
gate protects LR content, invoice files and print requests as well as the UI.

Editors can request unlocks on Order, VNN, Pricing, Loading Info and LR records.
Approvers/admins review requests; granting one retains the approved snapshot,
shows Correction draft and blocks downstream review. VNN Parts 1 and 3 open
together. Loading correction restarts Part 1, then Part 2. Existing correction
submission and reapproval propagate the approved changes to the next stage.

Photo minimums: Part 1 requires 3 VBP and 3 VFT; Part 2 requires 5 VL and 3 VOT.
Draft saves and the existing source-order photos-optional exception remain.
Photo slots store one path each; use separate slots for the minimum photos.
The Loading stage guide identifies each part and its approval status.

Transaction lists use bounded scrolling with sticky headers. Work notifications
are grouped by module/action; activity is grouped by module/event and record.
Search and panel filters apply to work and activity; activity also supports
India-date filtering and server-side search of older history within access.
The existing 50-record per-panel work limit and 200-event activity window remain;
search filters before these limits to find older matching records.

## Validation

Run `npm run test:workflow-controls` for 23 offline suites, including actual
cancellation and correction handlers with mocked database dependencies,
financial/POD blockers, shared loads, failure handling, charge review, LR
eligibility, photo policies, reapproval propagation and notification regression
checks. These do not constitute a live MongoDB transaction or browser acceptance
test and do not change company data.

Restart the application after deployment so Mongoose loads the new metadata
fields and middleware. No database migration is required for new actions.

Validation environment notes: the production build was attempted with both the
normal output and a separate output directory. Both stopped on Windows EPERM
errors while creating build folders, so a complete production build is not
verified. The additional branch-access regression has an existing failure at
`test-branch-access.mjs:151` (expected 2 notifications, received 1); this was
reproduced with the source files read from HEAD as well as the working tree.

Role-separated coverage and fixes are detailed in ROLE_WORKFLOW_TEST_RESULTS.md.

## Loading approval blocked by a stale VNN revision

A Loading Info source dependency can remain on an older VNN revision even when
its visible fields already match the approved VNN. The approval banner now
exposes the existing **Sync latest VNN data and request reapproval** action for
that revision-only mismatch. A Loading editor, Loading approver or admin can
sync. The app reloads the form, updates source dependencies and restarts Part 1
review; existing photo uploads remain. Part 1 approval then hands Part 2 to the
Loading editor for submission and final approval. VNN does not need another
unlock merely to repair this stale reference. Initial current-version records
continue through their normal first approval without a sync warning.

`test-loading-stale-vnn-recovery.mjs` exercises the actual approval-status GET,
sync POST, Part 1 approval, separate editor submission and Part 2 approval with
mocked persistence. It also verifies recovery authorization and photo retention.
