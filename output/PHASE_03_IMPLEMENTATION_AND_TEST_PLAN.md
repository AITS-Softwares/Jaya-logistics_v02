# Phase 3 - Driver-Only UI and Integrated Test Plan

**Status:** Implemented on 7 October 2026.  
**Scope:** A dedicated hosted driver UI at `/m/driver`, designed for phone/tablet screens and backed only by the Phase 2 mobile API. Existing ERP UI, dashboard routes, staff APIs and root Android wrapper remain unchanged.

## What Phase 3 adds

| Area | Implementation |
|---|---|
| Driver UI route | `src/app/m/driver/*`; no ERP dashboard layout/sidebar is imported. |
| Login | Driver mobile + administrator-provisioned PIN. |
| Device flow | One generated non-secret installation ID per browser/device preview; pending state clearly instructs driver to seek dispatcher approval. |
| Trip visibility | Only the authenticated driver's assigned mobile-trip DTOs are displayed. |
| Trip actions | Versioned/idempotent actions use the exact Phase 2 API protocol. |
| UX | Branded mobile layout, prominent primary state action, stops list, issue quick-actions, sign-out and refresh. |
| Security boundary | Tokens stay in memory in Phase 3. No credentials/tokens are stored in localStorage. A non-secret installation ID is stored so dispatcher approval maps to the same app installation. |

## Explicit Phase 3 exclusions

- No GPS permissions, background collection, map, route-origin update, offline queue, native secure-token store, push notification, POD, OTP delivery proof, or APK release distribution.
- No staff UI for driver/device/trip administration. Phase 2 exposes protected staff APIs; a focused ERP administration screen can be added later without exposing it to drivers.
- No direct calls to legacy `/api/loading-panel`, `/api/tracking`, or other ERP APIs from the driver UI.

## Local verification completed

| Check | Result |
|---|---|
| `npm run test:mobile:phase2` | Passed |
| Full `next build` after UI integration | Passed |
| Driver UI route `/m/driver` | Returned `200` in production-mode smoke test |
| Unauthenticated `/api/mobile/v1/trips` with mobile feature enabled | Returned `401 UNAUTHORIZED` as required |

## Configuration before integrated test

On the **test/staging server** only, add secure values:

```env
DRIVER_MOBILE_ENABLED=true
DRIVER_MOBILE_JWT_SECRET=<long-random-different-secret>
```

Rebuild and restart through the existing deployment process. Do not enable this on production until this test passes. The feature is safe to disable immediately by changing `DRIVER_MOBILE_ENABLED=false` and restarting.

## Complete integrated testing steps

### 1. Baseline verification

From the workspace:

```powershell
npm run test:mobile:phase2
npm run build
```

Start a local verification server only after build completes:

```powershell
$env:DRIVER_MOBILE_ENABLED = "true"
$env:DRIVER_MOBILE_JWT_SECRET = "use-a-new-long-test-secret"
npm run start -- -p 3000
```

Open `http://localhost:3000/api/mobile/v1/health`. Expect `200` and `status: healthy`.

### 2. Obtain an existing ERP staff token

Log in to the ERP as a company account, administrator, or a user with **Tracking Plan** permission. In the browser developer tools, copy the existing `token` value from the ERP session. It is used only in the next staff API calls; do not put it in source code or share it.

In PowerShell, set it only for the current terminal:

```powershell
$staffToken = "PASTE_CURRENT_ERP_STAFF_BEARER_TOKEN"
$headers = @{ Authorization = "Bearer $staffToken"; "Content-Type" = "application/json" }
```

### 3. Create one test driver

Use a real test mobile number that is not already a DriverProfile:

```powershell
$driver = Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/mobile/v1/admin/drivers" -Headers $headers -Body (@{
  displayName = "Driver Test"
  mobile = "9876543210"
  pin = "2468"
  preferredLanguage = "en"
  consentVersion = "pilot-v1"
} | ConvertTo-Json)
$driver.data
```

Record the returned driver `id`.

### 4. Create a trip from an existing Loading Info

In the ERP, select a test Loading Info that has a vehicle number and whose `vehicleInfo.driverMobileNo` matches the test driver's mobile number. Copy the Loading Info Mongo ID from its ERP URL/API response. The system intentionally rejects a mismatch.

```powershell
$trip = Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/mobile/v1/admin/trips" -Headers $headers -Body (@{
  loadingId = "PASTE_LOADING_INFO_MONGO_ID"
  driverId = "PASTE_DRIVER_ID"
} | ConvertTo-Json)
$trip.data
```

Verify the returned loading reference, vehicle and stops are correct. This proves the existing Loading Info/LR data is read but not modified.

### 5. Driver sign-in and pending device check

Open `http://localhost:3000/m/driver` in an incognito/private browser or Android Chrome. Enter the test driver mobile and `2468`.

Expected result:

- The driver sees “waiting for dispatcher approval.”
- `/api/mobile/v1/trips` is not shown before approval.
- Existing ERP menus are never visible.

### 6. Approve the registered device

Get the pending device through the database/admin API. For this implementation the staff device list screen is intentionally not built yet. Query MongoDB or use the approved staff tooling to identify the new `DriverDevice` ID, then call:

```powershell
Invoke-RestMethod -Method PATCH -Uri "http://localhost:3000/api/mobile/v1/admin/devices/PASTE_DEVICE_ID" -Headers $headers -Body (@{ action = "approve" } | ConvertTo-Json)
```

Back in the driver UI, tap **Refresh approval**. Expected result: the assigned trip appears.

### 7. Exercise driver state actions

In the driver UI, run the normal path:

1. Start trip
2. At pickup
3. Start delivery
4. Arrived at stop
5. Confirm delivery
6. Complete trip

Expected result:

- The primary button changes after each action.
- Refreshing trips shows the latest state.
- An action sent twice with the same idempotency key produces only one `TripEvent`; the UI normally generates a fresh UUID per tap.
- Calling an action from an invalid state returns `409 INVALID_TRANSITION`.

Test **Report an issue** (traffic/fuel/etc.) on an active trip and confirm it changes only `issueStatus`/event history; it must not overwrite an ERP Loading Info record.

### 8. Security and isolation checks

- Attempt `GET /api/mobile/v1/trips` with no token: expect `401` after mobile feature is enabled.
- Sign in as another driver and request the first driver's trip ID: expect `404`.
- Revoke the device with `{ "action": "revoke", "reason": "test" }`; the current driver session must lose trip access.
- Set `DRIVER_MOBILE_ENABLED=false`, restart, then confirm `/api/mobile/v1/trips` returns `503 MOBILE_DISABLED` while ERP pages still work.
- Confirm no driver response contains rate, total amount, staff user data, raw LoadingPanel object, or unrestricted document URL.

### 9. Mobile/tablet visual check

Use Chrome device emulation or a real Android device at phone and tablet widths:

- Login fields and primary buttons are reachable without horizontal scrolling.
- Stops remain readable and touch targets are comfortably large.
- Driver cannot navigate to `/admin` from this UI; if the ERP domain is shared during test, reverse-proxy restriction remains a Phase 1 deployment requirement.
- Refresh/sign-out work.

## Test completion record

| Check | Result | Tester/date | Notes |
|---|---|---|---|
| Phase 1 preflight/domain boundary | Pending |  |  |
| Phase 2 models/API provision | Pending |  |  |
| Driver login/pending approval | Pending |  |  |
| Device approval/trip visibility | Pending |  |  |
| Valid lifecycle action flow | Pending |  |  |
| Wrong driver/wrong trip rejected | Pending |  |  |
| Device revoke/feature-flag rollback | Pending |  |  |
| Phone/tablet visual review | Pending |  |  |

## Next phase

Proceed to Phase 4 only after the test record passes. Phase 4 replaces Phase 3's in-memory session handling with native Android secure storage and adds the foreground location service, encrypted offline outbox, location batch API and tracking-session lifecycle.
