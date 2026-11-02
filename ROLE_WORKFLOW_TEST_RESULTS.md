# Role-separated workflow test results

Date: 2 November 2026

`npm run test:workflow-controls` runs 23 offline suites. The three added role
suites exercise real application handlers and permission checks with simulated
identity selection and in-memory persistence. They do not create accounts,
change company records, test live login sessions or replace MongoDB/browser
acceptance testing.

Each fixture uses 21 distinct identities: creator, editor, approver and viewer
for each of Order, VNN, Pricing, Loading Info and LR, plus an admin. Each ordinary
identity has view plus exactly one action in its own panel. The Pricing approver
has only the dedicated Pricing Panel - Part 2 Approval module, not Pricing edit.

## Coverage

- 190 edit/approve isolation checks across all five panels, including creators,
  viewers and approvers from other panels being denied.
- Editors request unlocks; only matching panel approvers/admins can grant,
  reject or restore them. Admin direct unlock is tested separately. Notifications
  go to the proper role. Restoring an unlock clears its old pending request.
- Edit-only accounts save correction drafts, submit, receive returned work,
  correct and resubmit. Separate approvers approve. No create or approve grant
  is added to an editor to make a test pass.
- Existing initial drafts can be completed and submitted by a separate editor.
  A creator still cannot edit existing documents or inject LR approval status.
- Actual Order approval propagates changed weight to VNN. VNN reapproval
  propagates to Pricing, Loading and LR. Pricing goes to its editor first, then
  its dedicated approver. Loading Part 1 approval hands Part 2 to its editor,
  who submits it to its approver. LR rejection returns to its own editor.
- Downstream approvers cannot skip upstream review. Completed reviews leave no
  stale actionable task for the tested creators, editors or approvers.
- Order creators/editors request cancellation; a distinct Order approver can
  reject or accept. Other-panel users cannot decide it. Admin cancellation is
  direct. Paid advances, recorded POD and paid balance payments block all
  authorized roles, including admin; the approval step rechecks new payments.
- Cancellation of approved Loading/LR/invoice records retains the invoice and
  updates the linked workflow. A different Pricing editor enters charges and a
  dedicated Pricing approver rejects/approves them. Wrong-role/wrong-panel
  charge writes are denied. Cancellation rejection reaches its requester.

## Fixes driven by these tests

- Allow Order/LR correction draft saves and edit-only Pricing/LR draft submission.
- Prevent LR approval before resubmission and forged Approved status on creation.
- Prevent Pricing approval or Part 2 reopening before editor submission.
- Return rejected Pricing/LR reapproval to editors, rather than leaving it in an
  approver queue; notify editors rather than only the original creator.
- Include VNN row changes in Pricing synchronization even when headers match;
  preserve saved rates, refresh totals, and hand the review to Pricing editors.
- Send Loading Part 2, rejected unlock and rejected cancellation notifications
  to the correct panel role/requester. Clear stale unlock requests on restore.

The pre-existing Windows production-build EPERM issue and the independently
reproduced baseline branch-notification regression remain documented in
WORKFLOW_CONTROLS.md. These role tests do not claim a successful production
build or live multi-user browser acceptance test.
