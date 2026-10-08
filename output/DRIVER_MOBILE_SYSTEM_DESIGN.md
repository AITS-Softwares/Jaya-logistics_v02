# Jaya Logistics Driver Mobile Application - System Design

**Status:** Proposed production architecture  
**Scope:** Android phones and company tablets first; a mobile-only driver experience backed by the existing Jaya Logistics Next.js ERP and MongoDB database.  
**Out of scope:** Replicating the ERP, exposing ERP URLs to drivers, e-way bill automation, and a public consumer application.

## Executive decision

Build a **dedicated Capacitor Android application**, not React Native, Flutter, or a generic Android WebView. It will use the existing Next.js project, database, and server deployment, but it will have its own driver-only UI route family and its own mobile API family.

The app is a hybrid application:

```text
Driver / company tablet
        |
        | Capacitor native Android shell
        | - native foreground location service
        | - encrypted local queue
        | - notification, camera and network bridges
        v
Driver-only web UI (/m/driver/*)
        |
        | HTTPS, access token + registered device
        v
Mobile API (/api/mobile/v1/*)
        |
        v
Existing Next.js business layer + MongoDB
        |
        +--> existing Loading Info, LR, Vehicle and Tracking Plan data
        +--> new mobile tracking collections
        +--> server-side Google Routes / Places calls only when needed
```

This is one backend and one database. The driver app is deliberately a **limited client of the ERP**, rather than a second ERP.

## Why Capacitor is the correct choice here

The repository is a Next.js 15 / React 18 application, already has Capacitor Android files, and already uses hosted-web Capacitor mode. Capacitor lets the team retain React, Tailwind, current components, and the same deployment while adding the Android capabilities that a browser cannot reliably provide: a foreground location service, background execution, notification actions, secure device storage, camera/POD capture, and durable local data.

React Native and Flutter would require a separate screen implementation and a new mobile state/UI layer. A plain Android WebView or PWA must not be used for fleet tracking: when Android backgrounds or kills the browser, background location becomes unreliable.

### Critical correction to the existing Capacitor configuration

The present `capacitor.config.json` uses a `server.url` pointing at the whole hosted ERP. That does **not** bundle the Next.js project into the APK; it opens the remote website. It must not be used as-is for a driver release, because the whole ERP is loaded by the WebView.

Use one of these deployment modes:

| Mode | Recommendation | Behaviour |
|---|---|---|
| **Hosted driver UI (recommended for v1)** | Use Capacitor `server.url` only for `https://driver.<company-domain>` | Small APK; driver UI updates with server deployments; native location service remains in the installed app. |
| Bundled UI (later/offline UI hardening) | Export a separate driver-only static web build into Capacitor `webDir` | UI assets live in the APK; APIs still require the server. This cannot bundle API routes or dynamic Next server rendering. |

For v1, use the hosted driver UI. The production reverse proxy should expose only `/m/driver/*`, `/api/mobile/v1/*`, and required Next static assets on the `driver.` subdomain. The existing ERP stays at `erp.` (or its current domain). This is a traffic boundary, not the security boundary: the API must still reject every unapproved action.

## What the project already provides

The plan builds on the repository rather than assuming an unrelated generic system:

- Next.js App Router and MongoDB/Mongoose already power the ERP.
- Loading Info records already include `companyId`, `vehicleArrivalNo`, `vehicleInfo.vehicleNo`, `vehicleInfo.driverName`, `vehicleInfo.driverMobileNo`, and order rows.
- The current Tracking Plan already obtains consignor/consignee stops, geocodes them, and can call Google Routes with the current vehicle position as `origin`.
- Google Places/Routes calls already stay server-side and use cache/rate-limit logic. Keep that rule.
- Company users already have JWT and module permission infrastructure. Driver credentials must **not** reuse a broad CompanyUser/ERP token.
- An Android Capacitor shell exists, but it currently declares only internet permission and its Capacitor package versions are not aligned (`@capacitor/core`/Android 7 versus CLI 2.5). Align all Capacitor packages to one supported major release before mobile work starts.

There is no durable driver-to-device assignment, trip/session model, location-history collection, or protected mobile API layer in the current code. Those are intentional additions below.

## Product boundary: exactly what a driver can do

The driver sees only their current and recent trips. They never receive an admin sidebar, ERP navigation, master-data search, transaction list, direct document URLs, or any API allowing arbitrary IDs.

### v1 driver screens

1. **Welcome and device check** - language, consent, GPS permission, battery-unrestricted guidance, network and app-version health.
2. **Secure sign in** - driver mobile number + OTP/PIN; then device registration/approval.
3. **My trips** - only trips assigned to the authenticated driver and registered device.
4. **Active trip** - vehicle, LR/loading number, current phase, route status, next stop, consigner address and consignee/drop addresses, contact shortcuts, and a big tracking status indicator.
5. **Trip actions** - Start Trip, Arrived, Loading/Pickup Complete, Start Delivery, Reached Destination, Delivered, and End Trip. The server returns only transitions valid for the current trip state.
6. **Report issue** - one-tap Break, Fuel, Traffic, Breakdown, Accident, Waiting at Customer, Other; optionally voice note/photo later. Reporting is helpful but never required for tracking.
7. **Tracking health** - last GPS sent, queue depth, permission/battery/network status, and a clear “tracking active” persistent notification.
8. **Trip history** - limited read-only summaries, not the ERP’s full history.

The visual design should use Jaya Logistics brand colours, large touch targets, one primary action per state, Hindi/English-ready text, and an information hierarchy suited to a mounted phone/tablet. It should not resemble a government portal or a compressed desktop dashboard.

## Identity, authorization and device control

### Separate identities

Create a `DriverProfile` model instead of treating the loading record's driver name/mobile as an identity.

```text
DriverProfile
  _id, companyId, displayName, mobileE164, employeeOrVendorRef
  status: active | suspended | archived
  preferredLanguage, consentVersion, consentAt
  loginPinHash or OTP policy, createdAt, updatedAt

DriverDevice
  _id, companyId, driverId, installationIdHash, devicePublicKey or deviceSecretHash
  platform, manufacturer, model, appVersion, status: pending | approved | revoked
  lastSeenAt, lastKnownBattery, registeredAt, revokedAt
```

- Sign-in returns a short-lived access token (15 minutes) and a rotating refresh token stored in Android Keystore-backed secure storage.
- Registration binds one approved installation to a driver. A dispatcher/admin can approve, revoke, or reassign it.
- Every mobile token carries a dedicated audience (`driver-mobile`), `driverId`, `companyId`, device ID and allowed scopes. It must not carry the ERP module map.
- Require server-side lookup on every sensitive request: active driver, active device, same company, and active trip assignment. Never trust a `driverId`, `vehicleId`, `loadingId`, or trip ID supplied by the app.
- On logout, revocation, reassignment, or trip completion, invalidate refresh tokens and stop the native service.

### Mobile API surface

Version all endpoints under `/api/mobile/v1`. They return purpose-built DTOs, not raw Mongo documents.

| Endpoint | Purpose | Authorization |
|---|---|---|
| `POST /auth/request-otp` and `POST /auth/verify-otp` | login | rate-limited mobile number/device fingerprint |
| `POST /devices/register` | bind installation | authenticated driver, one approved device policy |
| `POST /auth/refresh`, `POST /auth/logout` | session lifecycle | active driver/device |
| `GET /me` | driver/device health and configuration | active driver/device |
| `GET /trips?state=active` | assigned trip summaries | server filters by driver + company |
| `GET /trips/:tripId` | driver-safe trip detail and permitted actions | assignment check |
| `POST /trips/:tripId/actions` | state transition or issue report | assignment + transition validation |
| `POST /tracking/batches` | acknowledged location/event upload | active session/device/trip validation |
| `POST /tracking/heartbeat` | app/device health | active driver/device |

The legacy ERP APIs, including `/api/loading-panel`, `/api/vehicles`, and `/api/tracking/*`, remain staff APIs. The mobile app never calls them directly.

## Trip and tracking data model

Do not add raw GPS arrays to Loading Info. Large, high-write telemetry must be separate from business records.

```text
DriverTrip
  _id, companyId, loadingId, lrIds[], vehicleId or vehicleNo, driverId, deviceId
  routeSnapshot: { stops[], plannedPolyline, distanceKm, plannedDurationSec, plannedAt }
  state: assigned | started | at_pickup | in_transit | at_stop | delivered | completed | cancelled
  startedAt, completedAt, lastLocationId, lastLocationAt, lastEventAt
  nextStopIndex, ETA, delayStatus, version

TrackingSession
  _id, companyId, tripId, driverId, deviceId, vehicleNo
  state: active | paused | ended | stale
  startedAt, endedAt, lastSequence, lastRecordedAt

LocationPoint
  _id, companyId, sessionId, tripId, driverId, deviceId
  sequence, idempotencyKey, latitude, longitude, accuracyM
  speedMps, bearingDeg, altitudeM, recordedAt, receivedAt
  batteryPct, isCharging, networkType, provider, isMocked

TripEvent
  _id, companyId, tripId, type, source: driver | automatic | dispatcher
  occurredAt, locationId or coordinate, payload, confirmedAt, createdBy

StopEpisode
  _id, companyId, tripId, startedAt, endedAt, centre, durationSec
  classification: traffic | fuel | meal | overnight | customer_wait | breakdown | unknown
  confidence, confirmedByDriver, linkedStopIndex
```

Indexes: unique `{sessionId, idempotencyKey}`; unique `{sessionId, sequence}`; `{companyId, tripId, recordedAt}`; `{companyId, vehicleNo, recordedAt}`; and a TTL index for raw `LocationPoint` retention. Keep raw points for 90 days initially, retain trip events/stops and a simplified route summary for the agreed business retention period.

## Assignment and state machine

The back office assigns a driver and vehicle to a loading/LR through an explicit `DriverTrip` creation step. For the initial version, a dispatcher creates the trip when the vehicle/driver assignment is final. Snapshot stops and key commercial data at assignment time so later ERP edits do not silently alter an in-progress trip.

```text
assigned --Start Trip--> started --At Pickup--> at_pickup --Loaded/Depart--> in_transit
in_transit --Arrived at next stop--> at_stop --Continue--> in_transit
at_stop --Delivered--> delivered --Close trip--> completed
any active state --dispatcher cancellation--> cancelled
```

Each transition is server-side, idempotent, auditable, and validated against the expected current state. A stale client cannot overwrite a newer dispatcher action; use a version or ETag in action requests.

## Location collection and offline-first design

### Native tracking service

Implement a dedicated Capacitor Android plugin backed by Android `FusedLocationProviderClient` and a **location foreground service**. Start it only after the driver deliberately starts an assigned trip while the app is visible. It must show an ongoing Android notification with “Trip tracking is active”, vehicle/trip reference, and a stop/return-to-app action.

This native plugin is preferable to relying on WebView JavaScript timers or choosing an unverified generic background plugin for a business-critical service. Its small, stable interface should be:

```text
startTracking(tripId, sessionId, policy)
stopTracking(reason)
getTrackingHealth()
drainQueuedEvents()
onLocation / onHealthChanged
```

The web UI uses this bridge only after it has a valid mobile session. It never receives a server Google API key.

### Adaptive collection policy

Use a server-provided policy that can be adjusted without releasing an APK:

| Condition | Collection / upload target |
|---|---|
| Moving, speed >= 8 km/h | request every 30 seconds; upload at 30 seconds or 100 m, whichever occurs first |
| Slow city movement | every 60 seconds or 100 m |
| Stationary suspected | every 5 minutes; keep assessing stop episode |
| Overnight/rest state | every 15 minutes plus significant-movement trigger |
| GPS poor (`accuracyM > 100`) | record as low confidence; do not use alone for arrival/off-route decisions |
| Offline | persist locally; upload ordered batches once online |

The service should also receive Android activity/battery information where available, but business decisions must remain explainable without assuming it is perfect. Do not post coordinates every second and do not call Google per location ping.

### Durable local queue

Use encrypted SQLite (or Room/SQLCipher beneath the native plugin) for `outbox_event` records. Each has an immutable UUID idempotency key, monotonic sequence, recorded timestamp, retry count, and payload.

1. Write each point/event to the queue before an upload attempt.
2. Upload ordered batches of at most 100 points / 256 KB using gzip if supported.
3. Server responds with the accepted idempotency keys and highest contiguous sequence.
4. Delete only explicitly acknowledged rows. Exponential retry with jitter; retain enough data for at least 7 offline days.
5. On app restart/reboot, restore the active session and resume only if that session is still active after a server check.

The server accepts late/out-of-order history but calculates “latest vehicle position” only from plausible recorded timestamps, not arrival order.

## Automatic operations logic

Assume drivers will forget to report a halt. Driver actions enrich the data; they are not the source of truth.

### Stop detection

- Cluster points within roughly 100 m with low motion for 10 minutes to open a `StopEpisode`.
- Associate it with a planned stop when it is inside that stop's configurable geofence (initially 200 m; tune per site).
- Classify by duration, time, geofence, and driver confirmation: brief road delay, fuel, meal/rest, overnight, customer waiting/detention, breakdown/unknown.
- At 15 minutes away from an expected stop, notify the driver with one-tap choices. Keep the inferred classification if ignored.
- At 30 minutes without answer, flag operations; at 45–60 minutes or a high-risk breakdown pattern, escalate to dispatcher/call workflow.

### Arrival, route and ETA

- Route origins must be the **latest trusted driver/device location** after a trip starts, not the consignor company address. Before that point, route preview starts at the consignor/pickup address.
- The current Tracking Plan's `origin` support can be reused server-side after it is fed from `DriverTrip.lastLocation`; the driver app does not call its staff-protected endpoint.
- Recalculate server-side ETA at controlled intervals: trip start, meaningful route deviation, a major stop, and no more frequently than every 10 minutes while moving. Cache by rounded current position and remaining-stop set.
- A delivery is `arrived` only after geofence plus a plausible GPS reading; a driver action can request it but cannot silently bypass the audit trail.
- Mark tracking as **stale**, not stopped, when no expected ping arrives. Use different thresholds for moving, stopped and overnight policy.

### Integrity signals

Store but do not automatically punish: mock-location indication, impossible speed/distance, repeated coordinates, clock drift, severe accuracy, rooted-device risk (if adopted), service killed, permission withdrawn, battery critically low, and queue growth. Show operations a reasoned health state: `healthy`, `offline queueing`, `GPS weak`, `permission issue`, `service stopped`, or `suspected spoofing`.

## ERP dashboard integration

Add a staff-only live tracking view to the existing Tracking Plan rather than exposing the staff screen to the driver.

- Query `DriverTrip` and its latest accepted `LocationPoint` for fast list/map reads.
- Display last update/recorded time, freshness, GPS accuracy, battery/charging, route progress, ETA, current stop episode, reported issue, and queue/offline health.
- Fetch a historical trail from `LocationPoint` only for a selected time range and simplify it before drawing.
- Use polling first (15–30 seconds) because the existing Next.js deployment is already HTTP-based. Add WebSocket/SSE only when the server topology and operations need justify it.
- Keep Google map/routing requests in the backend and rate-limited; normal GPS pings cost no Google Maps API calls.

## Android permissions and company-device policy

The current Android manifest has only `INTERNET`; the mobile release will need precise location, foreground-service-location, notifications, and—where continuous tracking outside foreground use is required—background location with a clear in-app disclosure and consent trail. The exact manifest and runtime flow must match the Android target SDK selected during implementation.

Onboarding sequence:

```text
company/device policy -> sign in -> disclosure/consent -> precise location
-> notification permission -> battery optimization exemption guidance
-> start first assigned trip -> foreground service notification -> health check
```

For company-owned tablets, run a later device-management workstream: Android Enterprise fully-managed enrollment, MDM, app allowlist/lock-task mode, managed configuration (API host/environment), remote wipe/revoke, OS/app update policy, and a vehicle charger/mount standard. Do not make kiosk/MDM a blocker for the first controlled pilot.

## Security and privacy baseline

- HTTPS only; production domain with valid certificate; no `cleartext` transport.
- Separate driver subdomain and API namespace; reverse-proxy deny rules for ERP screens on that subdomain.
- Short-lived signed access tokens plus rotation/revocation of refresh sessions.
- Android Keystore-backed token/installation secret storage; never `localStorage` for session secrets.
- Per-endpoint authorization, company isolation, request schemas, payload size limits, rate limits, replay/idempotency checks, audit logs, and secret rotation.
- Google server keys remain server-side and are restricted to needed APIs. The APK contains no unrestricted Maps server key.
- Explicit tracking consent: explain purpose, active-trip-only scope, visible background notification, collection policy, contact, retention, and revocation path. Obtain legal/HR review before rollout.
- Document access to precise location, POD photos, driver contact data, retention/deletion, and incident response before Play distribution or wide company deployment.

## Delivery phases and acceptance gates

| Phase | Deliverable | Gate |
|---|---|---|
| 0. Foundation | Freeze trip lifecycle, driver/vehicle assignment ownership, consent policy, production driver subdomain | Written lifecycle and data-owner sign-off |
| 1. Mobile boundary | DriverProfile/Device/Trip models, mobile auth/device APIs, driver-only Next routes | Driver cannot retrieve another driver/company/trip by URL or API |
| 2. Native shell | Capacitor version alignment, branded driver shell, secure storage, permissions/onboarding | Release APK talks to production driver subdomain over mobile data |
| 3. Tracking spine | Native foreground service, encrypted queue, batch ingestion, latest location | Lock-screen 2-hour field test produces ordered, deduplicated points |
| 4. Operations | Stop detection, route/ETA service, live ERP map/health, dispatcher alerts | Simulated stop/off-route/offline/recovery scenarios pass |
| 5. Workflow | Pickup/delivery actions, issues, optional POD | Every action is authorized, idempotent and audited |
| 6. Pilot | 5–10 drivers, real multi-day routes, monitoring and support SOP | 2–4 weeks with agreed reliability/queue-loss thresholds |
| 7. Fleet rollout | MDM/kiosk for company devices, APK update channel, operating handbook | Pilot issues closed and rollback/revocation tested |

## Non-negotiable test matrix

- Mobile data only (no office Wi-Fi or USB debugging); server reachable through production HTTPS domain.
- Permission denied, revoked mid-trip, approximate-only GPS, GPS disabled, battery saver, OEM task killer, low battery, reboot, app force-close/reopen.
- Network loss for 30 minutes and for an overnight interval; server outage; recovery without duplicate or lost points.
- Background/locked-screen movement for 2 hours and real multi-day pilot drives.
- Device reassignment, revoked device, expired/rotated token, stolen phone, wrong driver/trip/company IDs, replayed batch, out-of-order and impossible-location data.
- Consignor address before trip versus actual driver location after departure; multi-drop route; customer geofence; long halt and dispatcher escalation.
- Google Routes failure/rate-limit and dashboard degradation without blocking location ingestion.

## Immediate implementation order

1. Replace the current “load whole ERP URL” Capacitor configuration with a separate driver app identity and production driver-domain configuration; align Capacitor packages before any native changes.
2. Add the `DriverProfile`, `DriverDevice`, `DriverTrip`, `TrackingSession`, `LocationPoint`, `TripEvent`, and `StopEpisode` models with indexes and retention policy.
3. Add `/api/mobile/v1` auth, device, trip, action, batch and heartbeat endpoints; write authorization tests before UI work.
4. Build `/m/driver` routes with no dashboard layout/sidebar and only DTO-backed driver views.
5. Implement and test the native Android foreground-location Capacitor plugin plus encrypted outbox against a test API.
6. Connect accepted latest locations to the existing Tracking Plan and reuse the existing server-side Google routing cache for controlled ETA recalculation.
7. Run the pilot before implementing MDM, automatic POD, push messaging, or Play Store publication.

## Architecture decisions explicitly rejected

- **No React Native rewrite:** unnecessary duplicate UI and business-client layer for an existing Next.js application.
- **No plain WebView/PWA tracking:** browser lifecycle is not sufficient for multi-day background vehicle tracking.
- **No full ERP loaded inside the driver APK:** hiding menus is not authorization and violates the requested module boundary.
- **No client-side Google server keys or route calculation on every ping:** expensive and insecure.
- **No raw coordinates stored inside Loading Info:** it is not a telemetry store.
- **No dependence on same Wi-Fi, a developer PC, USB debugging, or a running mobile build server:** release APKs call the public production HTTPS driver domain; the ERP server remains the only always-on backend dependency.

## References considered

This design preserves the strong parts of the supplied technical plan—dedicated mobile APIs, session/history separation, offline queueing, device registration, testing and MDM—while changing its React Native recommendation to Capacitor and adapting it to the actual Jaya Logistics repository. It also incorporates the supplied route/tracking discussion: driver location becomes the route origin once tracking starts; stops are inferred automatically; route/geocode API consumption stays controlled; and driver actions are confirmations rather than the sole source of operational truth.

Android's current guidance requires a location foreground service, the related permissions, and a visible user-facing notification for this type of background use; foreground-service start restrictions make “start tracking from a visible Start Trip action” a deliberate architecture rule. Company-owned dedicated devices can later use Android Enterprise/MDM lock-task policies without changing the application’s data design.
