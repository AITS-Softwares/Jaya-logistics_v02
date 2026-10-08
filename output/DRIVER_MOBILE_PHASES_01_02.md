# Driver Mobile App - Phases 1 and 2

These are the two phases to complete before building GPS tracking. They establish the operational rules and the secure mobile boundary so later mobile work does not expose the ERP or need a redesign.

## Overall delivery sequence

| Phase | Name | Outcome |
|---|---|---|
| 1 | Foundation and operating rules | A signed-off, testable trip lifecycle and secure production boundary. |
| 2 | Secure driver/mobile boundary | Driver identity, device/trip data models, and dedicated APIs with automated authorization tests. |
| 3 | Driver-only mobile UI and Capacitor shell | A branded APK can securely show only a driver's trips. |
| 4 | GPS tracking spine | Native background tracking, encrypted offline queue and ingestion. |
| 5 | Operations intelligence | Live ERP map, ETA, stop detection and alerts. |
| 6 | Driver workflow | Arrival, issue, delivery and optional POD actions. |
| 7 | Pilot and rollout | Controlled field pilot, MDM and fleet rollout. |

## Phase 1 - Foundation and operating rules

### Goal

Decide the business and deployment rules that software must enforce. This phase contains no driver app screens and no GPS collection; it prevents ambiguity from being built into the app.

### Duration

Approximately 3-5 working days, provided operations can make the listed decisions quickly.

### Work items

#### 1. Freeze the trip lifecycle

Document and approve these states and transitions:

```text
assigned -> started -> at_pickup -> in_transit -> at_stop -> delivered -> completed
                         \-------------------------------------> cancelled
```

For every transition, define:

- Who may perform it: driver, dispatcher, or automatic system.
- Required preconditions, such as driver assignment, active device, GPS health or a destination geofence.
- Whether the action can be reversed and who may reverse it.
- The ERP record(s) that supply the source data: Loading Info, LR, vehicle and order rows.
- The event visible to dispatch and the audit record retained.

Initial recommended rules:

| Action | Actor | Minimum rule |
|---|---|---|
| Create/assign trip | Dispatcher | Loading/LR, vehicle and a named driver must exist. |
| Start Trip | Driver | Assigned active trip, approved device, explicit tracking consent, location service can start. |
| Pickup complete | Driver | Active trip; optional pickup geofence warning, not a hard block for exceptional sites. |
| Arrived at destination | Driver | Active trip; capture GPS and warn if outside configurable customer geofence. |
| Delivered / close trip | Driver then dispatcher policy | Required delivery action; future POD/OTP rules are separate. |
| Cancel / reassign | Dispatcher | Stops device tracking and records a reason; never silently changes an in-progress trip. |

#### 2. Establish driver and vehicle assignment ownership

The current `LoadingPanel.vehicleInfo` contains driver name and mobile number, but that is not a secure identity or a durable assignment history. Decide who creates the formal `DriverTrip` record:

- Recommended: dispatcher creates it once Loading Info, vehicle and driver are confirmed.
- The record snapshots vehicle number, driver, ordered stops and relevant LR references at assignment time.
- Subsequent ERP edits do not silently change an in-progress driver trip; a dispatcher performs an explicit reassign/cancel flow.

Create a data-mapping sheet with these columns:

| Mobile trip field | Existing source | Owner | Snapshot or live | Decision needed |
|---|---|---|---|---|
| Loading reference | `LoadingPanel.vehicleArrivalNo` | Operations | Snapshot | Confirm unique business reference. |
| Vehicle | `LoadingPanel.vehicleInfo.vehicleNo` / Vehicle master | Operations | Snapshot | Decide whether vehicle master ID is mandatory. |
| Driver | Driver Profile (new) | Operations/HR | Live status; snapshot name | Decide driver onboarding owner. |
| Pickup | LR consignor or approved loading point | Operations | Snapshot | Confirm source when LR is absent. |
| Drops | LR consignee / loading order rows | Operations | Snapshot | Confirm ordering and multi-drop delivery rules. |
| Planned ETA | Server route service | System | Recalculated | Confirm business delay buffer. |

#### 3. Define tracking, alert and retention policy

Approve configuration values rather than hard-coding them:

| Policy | Pilot default | Owner to approve |
|---|---:|---|
| Moving location cadence | 30 sec or 100 m | Operations + technical lead |
| Stationary cadence | 5 min | Operations |
| Overnight cadence | 15 min | Operations |
| Suspected stop threshold | 10 min within 100 m | Operations |
| Driver prompt threshold | 15 min | Operations |
| Dispatcher escalation | 30 min | Operations |
| Critical escalation | 45-60 min | Operations |
| Customer/pickup geofence | 200 m initial | Operations |
| Raw GPS retention | 90 days initial | Management/legal |
| Stored trip events/summaries | Company retention policy | Management/legal |

Tracking is active only during an active trip. The app records a clear consent version/time, shows a persistent Android tracking notification, and provides a support/revocation path.

#### 4. Define the production network boundary

Create two public HTTPS entry points:

```text
erp.<company-domain>       -> existing ERP
driver.<company-domain>    -> only /m/driver/*, /api/mobile/v1/* and needed Next static assets
```

Rules:

- Mobile data must reach `driver.<company-domain>` without office Wi-Fi, USB debugging, a developer PC or a development server.
- HTTPS only; remove `cleartext: true` from the release configuration.
- MongoDB stays private; only the Next.js server talks to it.
- The reverse proxy limits exposure, but mobile API authorization remains mandatory.
- The current Capacitor configuration pointing to the complete hosted ERP is not a production driver configuration and must not be reused unchanged.

#### 5. Align the Capacitor baseline

Create a small technical spike/checklist:

- Align Capacitor CLI, core, Android and plugin packages to one supported major version. Current project packages mix Capacitor 7 core/Android with Capacitor CLI 2.5.
- Assign a new Android package ID and application name for the driver app. Do not ship it under the existing ERP app identity.
- Set up release signing-key ownership, secure backup and version-number policy.
- Confirm the production driver domain/configuration can be injected separately for development, test and production.
- Do not yet add location permissions or build a location service; that starts in Phase 4 after mobile auth and trip permissions exist.

### Phase 1 deliverables

- Approved trip-state/transition matrix.
- Data-mapping sheet for Loading Info/LR/vehicle/driver/trip.
- Versioned tracking, alert, retention and consent policy.
- Production domain/reverse-proxy design and owner.
- Capacitor upgrade/package/signing checklist.
- Short deployment and rollback procedure for the driver domain.

### Phase 1 acceptance criteria

Phase 1 is complete only when:

- Operations can answer who assigns a trip, who starts/ends it, and what happens on cancellation/reassignment.
- Every field visible to a driver has an identified source and sensitivity classification.
- The production driver hostname, HTTPS certificate owner and reverse-proxy owner are known.
- The client approves the tracking/consent/retention policy for the pilot.
- Technical lead confirms a supported Capacitor version baseline and release signing owner.

### Decisions required from Jaya Logistics in Phase 1

1. Will drivers use their own Android phones, company-owned phones/tablets, or both during the pilot?
2. Who creates/reassigns a trip: dispatcher, transport manager, or another role?
3. Is driver sign-in OTP-only, company-issued PIN, or OTP plus PIN?
4. Which public HTTPS domain will host `driver.<company-domain>`?
5. Must the pilot support multiple drops under one loading/LR from day one?
6. Who approves driver consent wording and data-retention periods?

## Phase 2 - Secure driver/mobile boundary

### Goal

Build the backend contract which lets a registered driver/device see and act only on assigned trips. This phase creates no full tracking service yet; it creates the authorization boundary that makes later tracking safe.

### Duration

Approximately 7-10 working days after Phase 1 decisions are frozen.

### Included implementation

#### 1. Add dedicated data models

Add Mongoose models and indexes for:

| Model | Purpose | Key protections |
|---|---|---|
| `DriverProfile` | Driver's controlled identity and status | Company-scoped, unique normalised mobile, suspension support. |
| `DriverDevice` | Registered APK installation/device | Hashed installation secret, pending/approved/revoked state, last seen. |
| `DriverTrip` | Explicit driver-vehicle-loading/LR assignment | State machine, trip snapshot, company/driver/device checks. |
| `TrackingSession` | One tracking interval for a trip | Exists now so Phase 4 can attach points safely. |
| `TripEvent` | Immutable driver/dispatcher/system actions | Audit source, timestamp and payload. |

Create `LocationPoint` and `StopEpisode` schemas in this phase if convenient, but do not start collecting location until Phase 4. Add their indexes/TTL policy before ingestion is enabled.

#### 2. Build dedicated mobile authentication

Implement `/api/mobile/v1/auth` endpoints:

- `POST /request-otp` - generic response, rate limits by mobile/IP/device signal.
- `POST /verify-otp` - verifies active DriverProfile, creates/updates driver session and returns mobile-specific short-lived access/rotating refresh tokens.
- `POST /refresh` - rotates a refresh session; detects reuse and revokes compromised session chain.
- `POST /logout` - revokes current session/device session.

Use a JWT audience such as `driver-mobile`. It contains only `driverId`, `companyId`, `deviceId`, session ID and narrow scopes. It is not a CompanyUser ERP token and must not include ERP modules or admin roles.

#### 3. Build registration and revocation

Implement:

- `POST /api/mobile/v1/devices/register` - records a unique app installation after login.
- Admin/dispatcher staff endpoints/UI controls to approve, revoke and reassign a device.
- A rule for one active approved device per driver during the pilot, with a documented exception process.
- Driver/device heartbeat capture: app version, device model, last seen and later health data.

#### 4. Build driver-safe trip APIs

Implement:

- `GET /api/mobile/v1/me`
- `GET /api/mobile/v1/trips?state=active`
- `GET /api/mobile/v1/trips/:tripId`
- `POST /api/mobile/v1/trips/:tripId/actions`

Responses must be dedicated DTOs. They return only driver-necessary trip data, ordered stops, approved contacts, current state and allowed actions. They must never return raw LoadingPanel documents, commercial rates, unrelated customer records, user lists, master data or unrestricted attachment URLs.

`POST actions` initially supports only safe non-GPS actions such as a driver acknowledgement and dispatcher-created test state transition. All actions use an idempotency key and expected trip version to prevent double taps or stale mobile clients.

#### 5. Enforce authorization centrally

Create one mobile-auth helper/middleware that every `/api/mobile/v1` route uses. It validates:

```text
valid mobile audience/token
-> active refresh/session state
-> approved, non-revoked device
-> active DriverProfile in same company
-> requested trip belongs to this driver/company
-> requested action is valid from current trip state
```

Do not depend on UI hidden menus, a URL prefix, or client-provided IDs for authorization.

#### 6. Tests, observability and migration

- Route-level integration tests for 401/403/not-found cases and valid company/driver/device/trip access.
- Tests for cross-company data, driver A requesting driver B's trip, revoked device, expired token, refresh reuse, wrong state transition, duplicate action, and stale expected version.
- Structured audit logging for login, device approval/revocation, trip view and state action (never log OTPs/tokens/location payloads in plaintext).
- Migration/backfill script or admin-only onboarding screen for initial DriverProfile and DriverTrip creation.
- Feature flag `DRIVER_MOBILE_ENABLED` so production deployment can be disabled safely without affecting the ERP.

### Explicit exclusions from Phase 2

- No full driver dashboard UI or branded Android UI.
- No background GPS permissions, native tracking plugin or GPS upload.
- No Google Maps calls from the driver client.
- No POD photo/signature/OTP delivery completion.
- No MDM/kiosk rollout.
- No WhatsApp/SMS trip-sharing workflow beyond login OTP delivery if selected.

### Phase 2 deliverables

- New company-scoped driver, device, trip, session and audit models plus indexes.
- Dedicated `/api/mobile/v1` auth, device, trip and action APIs.
- Internal dispatcher/admin mechanism to create DriverProfiles, assign trips, approve/revoke devices.
- API contract (OpenAPI or checked-in request/response examples).
- Automated authorization and state-transition tests.
- Feature-flagged production deployment and rollback instructions.

### Phase 2 acceptance criteria

Phase 2 is complete only when:

- A test driver can sign in and register an approved device.
- The API returns only that driver's assigned test trip(s).
- Requests for another driver's trip, another company's trip, legacy ERP API, revoked device, expired token and invalid state transition are rejected.
- A valid idempotent action creates exactly one auditable event.
- Disabling `DRIVER_MOBILE_ENABLED` makes all mobile APIs unavailable while existing ERP functions continue to work.
- A security review confirms tokens, OTPs and device secrets are not exposed in logs, browser storage or API responses.

## Start checklist

Start Phase 1 immediately with a 60-90 minute workshop involving transport operations, dispatch, the ERP owner and the deployment administrator. End the workshop with the six Phase 1 decisions recorded above.

Start Phase 2 only after that record is approved. Its first engineering task is to add the data models and a single authorization helper, followed by API tests; do not begin the mobile UI first.
