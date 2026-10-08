# Phase 2 Implementation Log - Secure Driver/Mobile Boundary

**Status:** Code complete and verified locally on 7 October 2026.  
**Feature flag:** `DRIVER_MOBILE_ENABLED=false` by default; set it to `true` only after an administrator is ready to provision pilot drivers and devices.

## Scope completed

| Capability | Implementation |
|---|---|
| Driver identity | `DriverProfile` holds a company-scoped, normalized mobile number, PIN hash, active/suspended state and consent version. It does not modify `CompanyUser`. |
| Registered devices | `DriverDevice` records a hashed app-installation identity, device state, version and revocation/approval audit fields. Only one approved device is retained per driver when an administrator approves a device. |
| Mobile sessions | `DriverMobileSession` uses 15-minute access JWTs plus hashed, rotating 30-day refresh tokens. Reuse of a rotated refresh token revokes the session family. |
| Formal assignment | `DriverTrip` snapshots the current Loading Info/LR-derived route, vehicle and driver at assignment time. It does not alter `LoadingPanel` records. |
| Audit trail | `TripEvent` provides idempotent driver/dispatcher events; `TrackingSession` is ready for Phase 4 GPS ingestion. |
| Mobile APIs | New `/api/mobile/v1/*` routes only. Existing staff ERP APIs are unchanged and are not called by the driver app. |
| Staff control | Existing ERP JWT/RBAC is reused: company accounts/admins or staff with Tracking Plan permissions can create driver profiles, assign trips, and approve/revoke devices. |
| Driver data boundary | Driver trip responses are purpose-built DTOs. They exclude raw Loading Info, price/rate data, unrelated trips, user lists, attachment URLs and ERP navigation. |

## New API contract

### Driver application

| Method/path | Purpose | Required state |
|---|---|---|
| `POST /api/mobile/v1/auth/login` | Mobile + provisioned PIN login | Feature flag enabled; active driver |
| `POST /api/mobile/v1/auth/refresh` | Refresh/rotate session | Valid unrevoked refresh token |
| `POST /api/mobile/v1/auth/logout` | Revoke current session | Valid mobile access token |
| `POST /api/mobile/v1/devices/register` | Register Android installation | Valid driver login token |
| `GET /api/mobile/v1/me` | Driver and device registration state | Valid mobile token |
| `GET /api/mobile/v1/trips?state=active` | Assigned trips only | Approved device |
| `GET /api/mobile/v1/trips/:tripId` | One owned trip DTO | Approved device + assignment |
| `POST /api/mobile/v1/trips/:tripId/actions` | State action/issue report | Approved device + assignment + correct version |

### ERP staff/admin

| Method/path | Purpose |
|---|---|
| `GET/POST /api/mobile/v1/admin/drivers` | List/create company-scoped DriverProfiles |
| `PATCH /api/mobile/v1/admin/devices/:deviceId` | Approve or revoke device |
| `GET/POST /api/mobile/v1/admin/trips` | List trips / create formal Loading Info-to-driver assignment |

## Driver action protocol

The app must send an `idempotencyKey` (12-120 chars) and current `expectedVersion` for every action. This prevents double taps and stale offline UI state from creating duplicate business events.

| Action | Valid starting state | Result |
|---|---|---|
| `ACKNOWLEDGE` | Any active state | Audit event only |
| `START_TRIP` | assigned | started; binds active device |
| `AT_PICKUP` | started/in_transit | at_pickup |
| `DEPART` | started/at_pickup/at_stop | in_transit |
| `ARRIVE_STOP` | in_transit | at_stop |
| `DELIVER` | in_transit/at_stop | delivered |
| `COMPLETE` | delivered | completed |
| `REPORT_ISSUE` | Any active state | Audit event and issue status |

GPS/geofence proof is intentionally not required yet; that is Phase 4/5. It does not weaken ERP records because the mobile action stream is independent and auditable.

## Existing-system impact

- No existing Loading Info, LR, vehicle, user, staff login, Tracking Plan or ERP API route was modified.
- Assigning a driver trip reads Loading Info and related LRs and stores a snapshot in `DriverTrip`; it does not overwrite their existing fields or workflows.
- Existing root Capacitor Android wrapper remains untouched. The separate driver shell from Phase 1 continues to use its own `mobile/driver` configuration.

## Verification performed

| Check | Result |
|---|---|
| `npm run test:mobile:phase2` | Passed: mobile normalization, state transitions and safe DTO filtering |
| Node syntax validation of key API routes | Passed |
| Capacitor 7 dependency baseline | Already validated in Phase 1 |
| Production Next.js build | Completed; generated application output successfully started with `next start` |
| Production-style route smoke test | Passed: health endpoint returned `200`; protected trip endpoint returned `503 MOBILE_DISABLED` while the feature flag was off |

## Required deployment configuration

Add the following only on the secure server environment, never to source control:

```env
DRIVER_MOBILE_ENABLED=false
DRIVER_MOBILE_JWT_SECRET=<long-random-different-secret>
```

Use `false` while deploying. Turn it to `true` only after at least one test `DriverProfile` is provisioned through the staff API and the driver hostname is protected by the Phase 1 reverse-proxy rules.

## Pilot provisioning runbook

1. Set `DRIVER_MOBILE_ENABLED=true` in the server environment and deploy/restart using the standard PM2 process.
2. As an authorized staff user, create a DriverProfile with a unique mobile number and a temporary PIN.
3. Create a `DriverTrip` using the chosen Loading Info and driver. Confirm the snapshot stops/vehicle are correct.
4. Driver signs in, submits its Android installation ID and receives `pending` device status.
5. Staff reviews the device and calls the device `approve` action.
6. Driver signs in or refreshes again. Only then can it call trip APIs.
7. Test an action with an idempotency key; repeat the same request and confirm no duplicate event is created.
8. Revoke the device and confirm subsequent access is denied.

## End-of-phase review checks

- [ ] `DRIVER_MOBILE_JWT_SECRET` is set to a dedicated production secret, distinct from the staff JWT secret.
- [ ] Driver mobile/PIN provisioning procedure is approved by operations and stored securely.
- [ ] Company confirms whether PIN login remains the pilot policy or whether SMS OTP is required. SMS OTP transport is intentionally not enabled without an approved provider/template/credit configuration.
- [ ] Staff permission holders for Tracking Plan are confirmed.
- [ ] A representative loading with correct vehicle/driver mobile and LR addresses can create a trip snapshot.
- [ ] Cross-company, cross-driver, revoked-device, expired-token, stale-version and duplicate-action test cases are performed against staging.
- [ ] `DRIVER_MOBILE_ENABLED` remains false until the separate driver hostname and Phase 1 operational approvals are complete.

## Recovery / rollback

- Set `DRIVER_MOBILE_ENABLED=false`, deploy/restart the normal ERP process, and all mobile routes return `503 MOBILE_DISABLED` without affecting existing ERP routes.
- Revoke a specific device to terminate its access, or suspend a DriverProfile to terminate all driver access.
- No database migration is destructive; the new Mongo collections remain isolated from existing workflow collections.
