# Cancelled-order replacement in approved Vehicle Negotiations

Users with Vehicle Negotiation **edit** permission can use **Replace cancelled
orders** on an approved, locked VNN that contains a verified cancelled source
order row. They do not need an administrator to unlock the VNN for this action.

The replacement panel is separate from the normal Part 1/Part 3 editor. Select
open replacement Order Panels and choose **Submit replacements for approval**.
The server removes cancelled rows, retains every other saved row unchanged,
and builds replacement rows from the authoritative Order Panel data. Requests
accept order and row IDs only; client-supplied rates, vendors, weights, header
changes and approval decisions are not accepted by this endpoint.

Both VNN approvals return to Pending, the record stays locked, and approvers
receive the existing workflow notification. Dependent Pricing, Loading and LR
records receive the existing upstream review markers in the same transaction.
The existing approval flow handles subsequent synchronization and reapproval.
No general unlocked state is granted. Held orders alone do not qualify.

Safeguards:

- The source cancellation is checked again when submitting, including legacy
  references which must resolve to exactly one source row.
- Replacement rows must be open, have no pending status request, and come from
  the current operating company and original branch. Draft orders, orders under
  correction, duplicates and orders already used by another VNN are rejected.
- Existing finalized-payment/billing and unsupported downstream-review blockers
  remain enforced. This exception does not bypass financial protections.
- The approved snapshot, detailed audit and review batch are retained. Rejected
  replacement requests can be submitted again through the same narrow action;
  rejection does not open commercial fields or a general amendment. The existing
  blocking batch is reused so downstream records do not retain stale markers.
- General approved-record amendments still require the administrator correction
  workflow. Notification/billing trigger behavior has not been changed.

Run `npm run test:vnn-replacement` for mocked scope, canonical-data, permission,
transaction, rejection/resubmission, and downstream-blocker checks. These tests
do not modify a database or company records.
