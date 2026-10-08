# Phase 4 - Native Tracking Spine and Combined Test Plan

**Status:** Backend and Android source complete on 7 October 2026.  
**Android compile status:** Pending local Android SDK/JDK availability. This workspace has no `JAVA_HOME` and no `java` executable, so `gradlew.bat assembleDebug` cannot run here. No build error in the source itself was reported; Gradle stopped before initialization.

## Phase 4 implementation

| Component | Delivered behaviour |
|---|---|
| Tracking sessions | `POST /api/mobile/v1/tracking/start` creates/reuses exactly one active session for the assigned driver/trip/device. |
| Location ingestion | `POST /api/mobile/v1/tracking/batches` accepts at most 100 validated points, enforces the session/device/trip relationship, and acknowledges duplicate idempotency keys safely. |
| Retention | Raw point TTL is 90 days; events and trip records remain separate. |
| Stop tracking | `POST /api/mobile/v1/tracking/stop` ends the active session and writes an auditable event. |
| Policy | Authenticated client policy endpoint exposes cadence/distance/batch settings rather than hard-coding them in the UI. |
| Android service | Dedicated `DriverTrackingService` is a location foreground service with persistent notification. |
| Offline outbox | `EncryptedOutboxDb` uses SQLite, with every coordinate payload AES-GCM encrypted using a key in Android Keystore. |
| Secure session data | Android `EncryptedSharedPreferences` stores tokens/session configuration encrypted at rest. |
| Recovery | The foreground service uses `START_STICKY`; queued points persist across temporary network loss and retry on later location updates. |
| UI integration | Starting a trip requests Android permissions, creates a server tracking session, then starts native tracking. Completing a trip stops the native service. Browser testing still performs normal trip actions but correctly reports that background tracking requires the Android app. |

## New server API contract

| Endpoint | Authentication/guard | Result |
|---|---|---|
| `POST /api/mobile/v1/tracking/start` | Active driver + approved device + owned started/active trip | Tracking session ID and server policy |
| `POST /api/mobile/v1/tracking/batches` | Active driver + same approved device + active session | Acknowledged and already-seen location keys |
| `POST /api/mobile/v1/tracking/stop` | Active driver + same approved device + active session | Ends session and emits audit event |
| `GET /api/mobile/v1/tracking/policy` | Active driver + approved device | Current cadence/batch/retention policy |

## Android prerequisites before testing

Install Android Studio with JDK 17 and Android SDK Platform 35. In a fresh PowerShell window, set the JDK path, for example:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
java -version
```

Set the approved test driver hostname and synchronize the standalone driver shell:

```powershell
cd "D:\NIKHIL'S WORKSPACE\JAYA LOGISTICS\Jaya-logistics_v02"
$env:DRIVER_APP_URL = "https://driver.your-company-domain.example"
npm run mobile:driver:sync
cd mobile\driver\android
.\gradlew.bat assembleDebug
```

The debug APK should appear under `mobile/driver/android/app/build/outputs/apk/debug/`. Use a real public HTTPS staging hostname, not a local/private IP, because the driver device must work on mobile data.

This workstation did not have a Java JDK available during implementation, so the Gradle APK command must be run after installing a JDK compatible with the Android Gradle plugin (JDK 17 is the expected baseline) and setting `JAVA_HOME`. Capacitor synchronization and the JavaScript validation suite completed successfully here; APK compilation remains a device/build-machine verification step.

## Complete combined test plan - Phases 1 through 4

### A. Local regression and production build

```powershell
cd "D:\NIKHIL'S WORKSPACE\JAYA LOGISTICS\Jaya-logistics_v02"
npm run test:mobile:phase2
npm run test:mobile:phase4
npm run build
```

Expected: both tests pass and `next build` completes.

### B. Deploy safely to staging

Set only in staging environment:

```env
DRIVER_MOBILE_ENABLED=true
DRIVER_MOBILE_JWT_SECRET=<a-long-random-secret-different-from-JWT_SECRET>
```

Deploy through the normal PM2 process. Confirm:

```powershell
Invoke-RestMethod https://driver.your-company-domain.example/api/mobile/v1/health
```

Expected: `{ success: true, service: "driver-mobile", status: "healthy" }`.

### C. Prepare data from existing ERP

1. Use a test Loading Info record with vehicle number, driver mobile, and one or more valid order/LR addresses.
2. As a normal ERP staff user with Tracking Plan permission, get the current staff bearer token from the existing ERP session.
3. Create a test driver using `POST /api/mobile/v1/admin/drivers` as described in the Phase 3 plan.
4. Ensure `LoadingPanel.vehicleInfo.driverMobileNo` matches the normalized DriverProfile mobile number.
5. Create a trip using `POST /api/mobile/v1/admin/trips`; confirm it snapshots the expected LR/stops and does not alter Loading Info.

### D. Browser/UI and access-control test

1. Open `https://driver.your-company-domain.example/m/driver` in private browsing.
2. Sign in with test driver mobile/PIN; expected: pending device approval, no trip data.
3. Approve its DriverDevice with `PATCH /api/mobile/v1/admin/devices/:deviceId` `{ "action": "approve" }`.
4. Tap **Refresh approval**. Expected: only the assigned trip appears.
5. Test Start Trip, At Pickup, Start Delivery, Arrived, Delivered, Complete, and Report Issue.
6. With no mobile token, `GET /api/mobile/v1/trips` must return `401`.
7. As a second driver, request the first trip ID; expected `404`.
8. Revoke test device; expected: further trip/tracking requests are rejected.

### E. Real Android tracking test

1. Install the generated debug APK on a test Android phone. Turn off Wi-Fi and use mobile data.
2. Sign in, register the device, approve it from staff tooling, then refresh the driver app.
3. Start the assigned trip. Grant precise location and notification permissions. On Android 11+, open the app details in Android Settings and allow location all the time where the device requires it; the plugin exposes the required state and opens app settings for this purpose.
4. Confirm a persistent notification says tracking is active. Lock the screen and travel or simulate movement for 15-20 minutes.
5. On the server, check `LocationPoint` documents for this `TrackingSession`:
   - correct driver, device, trip and session IDs;
   - increasing sequence values;
   - valid recorded/received timestamps;
   - no duplicate idempotency keys.
6. Disable mobile data for five minutes while moving. Confirm points accumulate in the encrypted native SQLite outbox (plugin `health()` shows queue count when inspected in Android debug tools). Re-enable data and wait for another location update; confirm server acknowledgements remove queued points.
7. Force-close/reopen the app and verify the Android persistent foreground service behavior according to the device manufacturer. Test reboot separately; OEM battery controls vary and must be part of the pilot validation.
8. Complete the trip. Confirm service notification disappears, TrackingSession state is `ended`, and `TripEvent` has `tracking_stopped`.

### F. Security, failure and rollback test

- Send a batch with an unknown trip/session/device: expect `409 SESSION_INVALID`.
- Send an out-of-range coordinate, invalid sequence or timestamp older than eight days: expect `400 INVALID_POINT`.
- Send the same location point/idempotency key twice: second response must list it in `existingIdempotencyKeys`, not duplicate it.
- Confirm the SQLite database contains encrypted payloads, not readable latitude/longitude JSON.
- Confirm Android app data does not contain plaintext access/refresh tokens.
- Set `DRIVER_MOBILE_ENABLED=false` and restart staging. Tracking/trip endpoints return `503 MOBILE_DISABLED`; existing ERP workflows remain unchanged.

## Phase 4 acceptance record

| Test | Status | Tester/date | Notes |
|---|---|---|---|
| Phase 1 domain/reverse-proxy boundary | Pending |  |  |
| Phase 2 driver/device/trip access isolation | Pending |  |  |
| Phase 3 driver UI lifecycle | Pending |  |  |
| Android foreground notification persists | Pending |  |  |
| Point batch validation/idempotency | Pending |  |  |
| Offline queue recovery | Pending |  |  |
| Background/locked-screen tracking | Pending |  |  |
| Device revocation and feature-flag rollback | Pending |  |  |

## Next phase

Phase 5 should add staff-only live tracking dashboard integration, automatic stop episodes, controlled route/ETA recalculation, stale-tracking status and operational escalation. Do not start fleet rollout before the above Android test record is completed on the actual phone models used by drivers.
