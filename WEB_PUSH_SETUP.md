# Jaya ERP Web Push — self-hosted server

This implementation uses the standard Push API and `web-push`, without Firebase.
The existing MongoDB inbox is the durable queue. A separate Node worker checks
for new notifications every five seconds. The Next.js request does not wait for
push delivery. No public send endpoint or extra worker API secret is required.

## Server setup

1. Install the committed dependencies with your usual deployment process. This
   repository currently needs `npm ci --legacy-peer-deps` for its existing peer
   dependency versions.
2. Run `npm run push:keys` **once**, in a trusted terminal. Save both keys securely.
   Do not regenerate on restart or deployment: key changes require devices to
   subscribe again. Never commit keys or paste the private key into chat.
3. Set the following in the ERP server environment or its untracked `.env.local`:

   ```dotenv
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<generated public key>
   VAPID_PRIVATE_KEY=<generated private key>
   VAPID_SUBJECT=mailto:<real monitored company email address>
   ```

   Use an actual `mailto:name@company.com` value, without angle brackets. The worker
   uses the ERP's existing `MONGODB_URI` and the database specified in that URI.
   Private keys stay on the server. Public configuration is returned by an
   authenticated settings endpoint so it also works without rebuilding the
   browser bundle when server environment settings change.
4. Production `npm start` now launches Next.js and the push worker together through
   `scripts/start-production.mjs`. `ecosystem.config.js` uses the same launcher.
   Run one `importexportsystem` instance: do not also run the standalone push
   ecosystem or `npm run push:worker`, which would duplicate worker activity.

   **One-time migration:** check `pm2 status`. If `jaya-erp-push` exists, remove
   that old standalone worker before starting the combined application:

   ```sh
   pm2 delete jaya-erp-push
   ```

   Skip that deletion if the process does not exist. Your future deployment
   routine can remain:

   ```sh
   pm2 stop ecosystem.config.js
   git pull backup main
   npm run build
   ```

   Continue only if the pull and build succeeded:

   ```sh
   pm2 delete importexportsystem
   pm2 start npm --name importexportsystem -- start
   pm2 save
   pm2 logs importexportsystem --lines 50
   ```

   The final syntax is `-- start`, not `--start`. Install dependencies before
   building when a release changes them (`npm ci --legacy-peer-deps`).
   Logs for both services now appear under `importexportsystem`; expect
   `[production] web process started.`, `[production] push process started.` and
   `Jaya ERP push worker started.` The launcher startup message alone is not a
   push-delivery health check: verify the worker log and send a test notification.

   If either child exits unexpectedly, the launcher stops its sibling and exits
   nonzero, allowing PM2 to restart the pair. Stop/restart signals are forwarded
   to both children, with forced termination after eight seconds if necessary.
   `ecosystem.config.js` provides a twelve-second PM2 shutdown timeout. The npm
   command above uses your PM2 default timeout; add `--kill-timeout 12000` before
   `-- start` if you want the same graceful shutdown allowance.

   Keep PM2's normal startup configuration so the saved process returns after
   reboot. VAPID settings and `MONGODB_URI` are still required; automatic startup
   does not configure credentials. Restart the combined app when settings change.
   Do not regenerate VAPID keys on deployments.

5. Allow outgoing HTTPS to browser push services from the server and tablet.
   Serve `/sw.js` as JavaScript over HTTPS, without authentication redirects or
   proxy caching. The Next.js configuration adds no-cache headers. Do not enable
   proxy caching for authenticated `/api/push/*` or notification inbox routes.

## Tablet activation and verification

1. Open the ERP in the managed web app and sign in. Tap the header bell, open
   **Notification settings** using the settings icon, then **Enable notifications**
   and allow Chrome's website notification prompt.
2. In settings, tap **Send test**, then place the app in the background. With the worker
   running, a test alert should arrive. The API saying "queued" confirms storage,
   not actual device delivery.
3. Tap the alert. It opens the inbox; **Open record** validates current ownership,
   workspace, branch and module permission before navigating. If signed out,
   sign in first on that same tab. Notifications from another operating company
   require signing in to that company first.
4. Submit an actual approval request and verify only eligible recipients receive
   it. Test a restricted branch user and a user whose permission was revoked.
5. Test locked-screen delivery and your actual full-screen/kiosk profile.
   Browser/OS restrictions, connectivity, force-stop and work-profile suspension
   can delay or prevent push; the persistent inbox remains available.
6. Log out on a shared tablet and verify the previous user's alerts stop. Logout
   removes the server subscription and unsubscribes the browser endpoint; a new
   user must explicitly enable push again. Signing in without a normal logout
   rebinds an existing endpoint to the current authenticated account.

## Behavior and limits

- New records created through the existing notification model are queued,
  including current workflow approval, pending-create, reapproval and project
  notifications. This does not invent new business triggers for events which do
  not already create inbox records, such as future tracking/overdue reminders.
- One header bell opens a drawer with **Action required** and **Activity** tabs.
  Action required uses the existing live correction/reapproval queue. Waiting
  stages are shown separately and do not inflate the action count. Activity
  groups updates for the same record. Marking activity read does not complete
  pending work. Record-level correction controls remain on their existing pages.
  Billing reminders now follow the client-wise rules in BILLING_NOTIFICATIONS.md.
  Restart the existing worker after deploying to activate daily scheduling.
- Existing notification history is not retroactively pushed. Inbox displays the
  latest 200 records before visibility filtering and refreshes every 30 seconds
  while visible, on focus, and when opened.
- Lock-screen messages intentionally contain no business references or rates.
- Workflow recipient selection keeps company, operating-company, branch and
  action permission checks. The worker rechecks account status, operating-company
  assignment, saved workflow branch ownership and action permissions. Record
  access is revalidated using current ownership when opening the notification.
- Each device has its own subscription. Disabling push affects only that browser
  profile. 404/410 subscriptions are removed. Transient failures retry with
  backoff up to five attempts; successful devices are not resent during ordinary
  retries. Delivery is at least once: a crash between sending and recording its
  receipt can cause a repeat, coalesced using the same notification tag.
- Read notifications and queued notifications older than 24 hours are skipped.
  Browser push TTL is one hour. Failed/skipped rows remain in the inbox.
- No authenticated pages or API responses are cached by the service worker.
- Subscription endpoints and encryption secrets are sensitive. Database access
  and backups need the same protection as other ERP credentials; do not log them.

Run `npm run test:push` for mocked delivery/security tests. These do not contact
the database, real users, browser push providers, or production server.
Run `npm run test:notifications` for grouping, read/work independence, action
ownership and existing reapproval queue regression tests.

`node scripts/smoke-web-push.cjs` starts a temporary local development server on
port 3108, compiles the admin page and new routes, verifies anonymous API requests
receive 401, checks service-worker headers, and stops the temporary server. Run
this with other local Next.js development servers stopped because it uses `.next`.

Run `npm run test:production-start` for offline launcher lifecycle checks. These do not start Next.js, the real push worker, or a database connection.
