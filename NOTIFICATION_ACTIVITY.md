# Notification Activity

## Admin oversight

Admins see **Work overview**, with **View pending** links to panel lists and client-wise billing work. Employees retain **Action required** and their existing Create/Review/Open billing labels. These presentation rules do not change create, approve or billing permissions.

Under bell → Settings → **Admin push alerts**, admins can edit account-wide preferences. Creation, approval and billing pushes default off; cancellation, hold and correction pushes default on. Existing device subscription settings still apply. Category preferences apply to alerts addressed to that account, not every event visible in its company overview. All permitted updates remain visible inside the ERP. Unknown event categories default off for admin pushes; explicit device tests remain available.

Preferences are saved in `notificationpreferences`, scoped by company and account. They apply across the account's subscribed devices and take effect when the worker processes future/queued alerts. Skipped alerts are not replayed. Restart the push worker when deploying this change. No delay/escalation thresholds have been introduced.

Admins now default to a company activity overview within their current operating company and permitted branches. Regular users continue to see notifications addressed to them and allowed by their current permissions. Group company accounts in consolidated mode can see the group overview.

Open the bell → Settings → **Activity view** to switch between **Company/branch activity** and **Addressed to me**. This choice applies during the current session. It never expands company or branch access. Every account has independent read tracking, shared between its two views. Reading Activity does not clear Action required.

For editable server defaults, change `src/lib/notificationActivityPolicy.mjs`:

- `adminOverview`: turn the company overview on/off; off returns admins to their personal inbox.
- `historyLimit`: unique visible events returned, default 200.
- `scanBatch`: database rows read per batch, default 500.
- `scanLimit`: maximum recipient rows examined per request, default 10,000. This is recent notification history, not an unlimited audit log.

Deploy/restart the application after changing server defaults.

New recipient copies inserted together share an event ID. Historical copies are deduplicated using their original event details and identical creation timestamp; historical copies with different timestamps remain separate to avoid losing repeated actions. No notification history is rewritten. Unresolvable older records are hidden where branch/company access cannot be established.

Read receipts live in the new `erpnotificationreads` collection. Marking an event read updates only the current account's receipt and its own recipient copies; it never marks another user's alert read. No manual data migration is needed.

The overview covers notification events already stored and future workflow events. It does not reconstruct past events for which no notification was saved. Future workflow submissions/decisions with no personal recipient are retained as overview-only events and are not pushed to devices.

Run the mock checks with `node scripts/test-admin-notification-activity.mjs`. They do not connect to the company database or send pushes.
