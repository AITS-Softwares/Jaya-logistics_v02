# Phase 5 — Live Operations View and Simple Test Guide

**Delivered in this step:** the existing ERP **Tracking Plan** page now has a **Driver live status** panel. It refreshes every 30 seconds and shows the assigned driver's trip state, latest GPS time, coordinates, accuracy, speed, and a clear **stale** warning when no GPS point has arrived for more than 10 minutes. The existing map also shows the vehicle marker when a GPS point exists.

This is an addition to the existing Tracking Plan workflow. It does not change Loading Info, LR, route planning, or the driver-only mobile access rules.

## What you need before you test

Ask one technical/deployment user to complete this once on a **staging** server:

1. Set `DRIVER_MOBILE_ENABLED=true` and a separate long `DRIVER_MOBILE_JWT_SECRET` in the staging environment.
2. Deploy the current code normally.
3. Create one test driver and one test trip from an existing Loading Info record. The Loading Info must have a vehicle number and the driver mobile number must match the test driver's mobile number.
4. Build and install the Android APK only when Android Studio/JDK 17 is available. Until then, the desktop Tracking Plan and the driver browser screen can still be checked, but real background GPS cannot.

## First test — office user (no APK needed)

1. Log into the normal ERP as a user who can already open **Tracking Plan**.
2. Open **Vehicle Tracking Plan** from the left menu.
3. Select the test Loading Info / vehicle in the search box at the top.
4. Find the new **Driver live status** section.

Expected result before the driver starts the trip:

- The assigned driver and vehicle are visible.
- Status reads **not started**.
- It says **No point received**. This is normal.
- The existing delivery schedule and route map still work exactly as before.

## Second test — driver browser flow

1. Open `https://<your-staging-domain>/m/driver` in a private/incognito browser window.
2. Sign in using the test driver's mobile number and PIN.
3. The first time, the device shows **waiting for approval**. This is normal.
4. Have an ERP administrator approve that test device using the mobile-driver administration process.
5. Return to the driver page and press **Refresh approval**.
6. Confirm that only the assigned test trip is shown. The driver must not see ERP menus, other vehicles, or another driver's trips.
7. Use **Start trip**, then step through the driver actions such as pickup and delivery.

Expected result: the office Tracking Plan panel shows the trip state, but browser testing intentionally does not send background GPS.

## Third test — real Android GPS flow

1. Install the Android APK on a test phone and sign in with the same test driver.
2. Approve the device if it is new, then refresh the driver app.
3. Open the assigned trip and press **Start trip**.
4. Allow precise location and notifications. In Android Settings, choose **Allow all the time** for location if the phone asks for background location.
5. Confirm a permanent tracking notification appears.
6. Keep the phone moving for a few minutes, then return to the ERP Tracking Plan page and press **Refresh GPS**.

Expected result:

- The new panel shows **active**.
- The last GPS time says **just now** or a few minutes ago.
- Coordinates, accuracy and speed appear.
- A blue vehicle marker appears on the map.

## Most important things to verify

1. **Isolation:** a driver sees only their own assigned trips; no ERP pages or other driver data are visible.
2. **Location freshness:** active GPS updates appear within a few minutes. Stop connectivity for more than 10 minutes and the office panel should say **stale**.
3. **Offline recovery:** turn off mobile data for a few minutes, move the phone, turn data back on, and verify the office panel updates later.
4. **Trip completion:** complete the trip in the driver app. The Android tracking notification disappears and office staff no longer see an active session.
5. **Safety switch:** when `DRIVER_MOBILE_ENABLED=false`, driver mobile calls are disabled while ordinary ERP Loading Info and Tracking Plan still work.

## If something looks wrong

- **No driver trip appears:** verify the driver mobile number exactly matches the Loading Info driver mobile number and the trip was assigned.
- **Device waits for approval:** ask the ERP administrator to approve that exact device, then tap Refresh approval.
- **No GPS on office page:** verify the Android notification is present, phone location is enabled, mobile data works, and the driver allowed precise/background location.
- **Status says stale:** this means the last location is more than 10 minutes old; call the driver and check battery, mobile data, location permission, and Android battery optimisation.
