# Customer portal

## Admin workflow

1. Sign in as a company administrator or an active staff user with the `Admin` role.
2. Open **Users → Customer Users → Create customer login**.
3. Enter the user's name, a login email you choose, and a password of at least 8 characters (maximum 72 UTF-8 bytes).
4. Select the Customer Master record and at least one permitted operating company.
5. Share the credentials with that customer. No email is sent automatically. A made-up login email works, but it cannot receive mail.

The login email is stored in `customerusers`, independently from Customer Master. Multiple accounts can link to the same customer. Login emails are unique across the customer portal, so login does not require a company selector. They can coincide with an internal staff email because the sign-in modes are separate.

Use **Manage** to edit assignments, disable an account, or set a new password. Saving any account change revokes previous sessions. Share the new password with the customer; it is immediately usable. There is no self-service email recovery in this version; administrators reset passwords here.

## Customer workflow

Select **Customer** on the existing sign-in page. Sign in directly with the email and password provided by the administrator. The customer reaches `/customer-dashboard`, which contains only My Orders, order/drop details, assigned vehicles and sign out. Customers cannot set or change their password; only administrators manage it. No staff navigation or transaction editing is exposed.

The portal shows approved, completed and cancelled orders linked by `customerId`, within the account's assigned active operating companies. Draft/submitted/rejected orders, deleted records, and orders currently undergoing reapproval are excluded. Names are never used to infer ownership. Legacy orders without a customer ID or operating-company ID do not appear; an administrator must link them correctly through the normal workflow. New non-draft saves and approval require a valid customer from the same tenant. Customerless drafts remain supported.

Vehicles come from approved/completed Loading Info records with exact `orderRows.orderPanelId` and `orderRowId` links, in the same tenant and operating company. Each drop can display several dispatch vehicles. Unverified legacy links do not show a vehicle. The portal does not infer In transit/Delivered from Open/Hold/Cancelled; those states need the tracking/POD integration.

## Tracking handoff

The **Track** control opens a customer-scoped location panel in order details. It uses the existing Google Maps component and `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` configuration. The endpoint is `/api/portal/orders/[id]/tracking?dispatchId=...`. It verifies order ownership, exact dispatch/drop links and ownership of every order sharing that dispatch. Mixed-customer dispatches do not expose location.

Only started/at-pickup/in-transit/at-stop trips with an active tracking session and a fresh, non-mocked GPS point expose coordinates. Completed/cancelled trips, ended/paused sessions, stale points and missing tracking data show an unavailable message. Location refreshes every 30 seconds while the panel is visible. No other customers' stops, full route history, driver contacts or credentials are returned. Tracking availability depends on actual driver GPS data; this change does not start trips or collect new locations.

## Authentication and isolation

- Customer accounts have their own model and fixed read-only scope, without staff roles/module permissions.
- Portal JWTs use an HMAC-derived key separate from the staff signing key, plus a portal audience/issuer and an eight-hour expiry. Existing `JWT_SECRET` is required; no additional secret is necessary. Rotating it invalidates both staff and portal sessions.
- `/api/portal/*` uses `requireCustomer`, which reloads account status, session version, customer access and active company grants on every request.
- Staff `verifyJWT`/`verifyToken` reject customer sessions. Middleware blocks customer bearer tokens from non-portal APIs, except the explicitly supported `/api/auth/me` session check. The middleware only decodes claims to deny access; portal handlers still verify signatures.
- New portal tokens cannot verify using the staff signing key, including in older routes calling `jwt.verify` directly. The middleware also denies still-unexpired legacy customer tokens at internal API boundaries. Keep `src/middleware.js` active in deployment.
- The old `/api/customers/login` path delegates to the new account login. Passwords stored on Customer Master/contact emails no longer grant portal access. Existing customer accounts must be provisioned in Customer Users; there is no automatic credential migration.
- API queries and response mapping expose only a defined set of safe fields. Prices, charges, driver contact details, approval history and internal remarks are excluded.
- Login attempts are limited to ten per normalized email per 15-minute window, using MongoDB records shared across app instances. This is an account-level limit; a reverse-proxy/IP limit can additionally control distributed attempts across many addresses.
- Disabling an account or changing its access/password revokes existing sessions; sign out removes the current browser's credentials.

## Deployment

No live database was changed during implementation or offline tests. Back up before deployment. Keep the existing `JWT_SECRET` securely configured and serve production over HTTPS.

Apply the new indexes against the intended deployment database (review `MONGODB_URI` and any process-level override first). From the project root on the Node version used by this project:

```powershell
node --env-file=.env --env-file=.env.local scripts/setup-customer-portal-indexes.mjs
```

If an environment file does not exist, omit its corresponding `--env-file` argument. Use the same environment configuration as the deployed app. The script creates indexes, including global uniqueness for customer login email and TTL expiry for login attempts. It does not create customer accounts or change existing records. Resolve any conflicting index/duplicate-data error before enabling customer access. Both new collections are login/configuration data; do not add them to the Order-to-Billing launch reset list.

Restart/deploy the app, then use an isolated test database to provision two customers and confirm each sees only their own orders and assignments. Test disabling, admin password reset, direct foreign order IDs, and staff-API rejection. Verify the configured map and a real active GPS session in the isolated deployment before rollout.

## Tests

```powershell
node --experimental-vm-modules scripts/test-customer-portal.mjs
```

The test harness runs actual auth/route handlers with in-memory model/database doubles. It never reads `.env` or connects to MongoDB. It verifies admin/customer isolation, tenant/company assignment checks, admin password hashing/reset, session revocation, login throttling, legacy-login retirement, customer order scoping, response fields and split-vehicle mapping. An integration test against an isolated MongoDB instance is still needed before production rollout.
