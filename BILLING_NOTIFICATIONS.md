# Billing and workflow notifications

## Billing reminders

- Yara customers (matched by the word Yara in the customer name): begin on the
  25th of the LR creation month. LRs created after the 25th qualify immediately.
- Other customers: begin five calendar days after the LR creation date.
- Dates use India time. Reminders continue daily, including across month-end,
  until the relevant LRs are fully billed. Partially billed LRs remain pending.
- Cancelled, rejected, deleted and draft LRs are excluded. Detention,
  cancellation and other supplementary-charge bills do not close freight billing.
- One daily notification per user/client/operating company, containing only that
  user's accessible LRs. Recipients need Billing View + Create, or an Admin role;
  operating-company and branch assignments still apply.
- Action required shows current client-wise billing work and opens the filtered
  billing register. Work clears after full billing. Old reminder entries are
  hidden when no eligible billing work remains, and queued pushes recheck eligibility.
- No Billing approval notifications or approval workflow were introduced.

Run the existing `npm run push:worker` service to schedule these reminders. It
checks every 15 minutes and queues once daily from 09:00 India time; optionally
set `BILLING_REMINDER_HOUR_IST` to another hour (0–23). Restart the worker after
deploying. Inbox scheduling works without VAPID keys; device push still requires
the existing VAPID setup. No Firebase or extra subscription is needed.

## Other panels audited

| Panel | Approval request | Creation handoff / outcome |
| --- | --- | --- |
| Order Panel | Submit and resubmit | Approved order → VNN creators; approval/return → creator |
| Vehicle Negotiation | Initial submit, resubmit and workflow lock | Approved/placed VNN → Pricing and Loading creators; approval/return → creator |
| Pricing Panel | Part 1 submission → dedicated Part 2 approvers | Approval/return/completion → creator; Part 1 saves do not prematurely notify approvers |
| Loading Info | Initial submit and later submission | LR creators on submit; Purchase creators after approval; decision → creator |
| Consignment Note | Initial submit and resubmit | Decision → creator |
| Purchase Panel | Initial submit and later submission | Advance creators; POD creators when memo is available; decision → creator |
| Advance Payment | Initial submit and resubmit | ERP approval/return → creator; bank authorization flow is unchanged |
| Proof Of Delivery | Initial submit and later submission | Approval → Balance Payment creators; decision → creator |
| Balance Payment | Initial submit and later submission | ERP approval/return/completion → creator |

Approval alerts open the respective approval page. Draft saves do not trigger
approval requests. Decision notifications target the original creator only when
they still have access; self-approval does not create a redundant personal alert.

## Live panel counts in Action required

Panel cards show current **yet to be created** and **documents need approval**
counts. Creation counts reuse the existing list-page chip endpoints for VNN,
Pricing, Loading, LR, Purchase, Advance, POD and Balance. Order Panel has an
approval count; there is no upstream order-creation backlog to invent.
Pricing approvals require its dedicated Part 2 Approval permission. Counts
respect current company/branch scope and the user's Create/Approve rights.
Billing stays client-wise. Detailed correction/sync/waiting work is retained;
individual approval cards already represented in a panel count are not duplicated.
The drawer refreshes on opening, navigation, focus and pending-work refresh events,
and every 30 seconds while the page is visible. No worker restart is needed for
these live counts. Failure to load a count is shown instead of claiming all work
is complete. Reading Activity does not clear creation or approval work.

Verify with `npm run test:panel-notifications` (mock data only).

Verification: `npm run test:billing-notifications`. Tests use mock data and do not
send real notifications or change company records.
