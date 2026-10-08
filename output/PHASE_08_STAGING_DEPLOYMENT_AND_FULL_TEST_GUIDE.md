# Phase 8 — Staging Deployment and Full Test Guide

This is the guide to use when you are ready to test from zero. It uses the screens added in the ERP and does not require Postman, MongoDB tools, or API knowledge.

## What Phase 8 adds

- `npm run mobile:driver:preflight` checks the required mobile deployment settings without printing secrets.
- The **Driver mobile setup** ERP page shows whether the feature flag, database, and separate mobile secret are ready.
- [DRIVER_MOBILE_IIS_WEB_CONFIG.example](DRIVER_MOBILE_IIS_WEB_CONFIG.example) provides an IIS configuration for a dedicated driver hostname that exposes only the driver page, driver API, and required Next.js assets.

## Roles in this guide

| Person | Does what |
|---|---|
| Technical/deployment person | Creates the staging URL, sets environment variables, builds and restarts the server. |
| ERP office user | Creates the driver, assigns a Loading Info record, and approves the phone. |
| Test driver | Signs in, starts a trip, and allows location permissions. |

## Part 1 — create a safe staging target (technical person)

Do this on a staging server first. Do **not** enable the feature directly in production.

1. Choose a new public HTTPS hostname, for example `https://driver.staging.your-company.example`.
2. Point its DNS record to the staging IIS server and install a valid TLS certificate for that hostname.
3. Create a separate IIS site bound only to that hostname. Put a copy of [DRIVER_MOBILE_IIS_WEB_CONFIG.example](DRIVER_MOBILE_IIS_WEB_CONFIG.example) in that site, as `web.config`.
4. Confirm the proxy port in the example matches the Next.js port. The checked-in PM2 configuration uses port `3000`; the older IIS configuration in this repository references `8080`, so the technical person must confirm which process port the staging server actually uses.
5. Do not add a catch-all proxy rule to this new driver IIS site. The whole point of this site is that `/admin`, `/api/loading-panel`, and other ERP pages return 404 on the driver hostname.

## Part 2 — configure staging environment variables (technical person)

In the repository root on the staging server, create a non-committed `.env.production` file. Keep the existing staging `MONGODB_URI` and other normal ERP values. Add these values:

```env
DRIVER_MOBILE_ENABLED=true
DRIVER_MOBILE_JWT_SECRET=<new-random-secret-at-least-32-characters>
DRIVER_APP_URL=https://driver.staging.your-company.example
```

Generate the mobile secret on the server; do not send it in chat, email, or a ticket:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`DRIVER_MOBILE_JWT_SECRET` must be different from the ERP `JWT_SECRET`.

## Part 3 — preflight, build, and start (technical person)

Open PowerShell in the repository root:

```powershell
cd "D:\path\to\Jaya-logistics_v02"
npm ci
node --env-file=.env.production scripts/verify-driver-mobile-deployment.mjs
npm run build
pm2 startOrReload ecosystem.config.js --only importexportsystem --update-env
pm2 status
```

Expected result:

- The preflight prints `Driver mobile deployment preflight passed`.
- `npm run build` completes without errors.
- PM2 shows `importexportsystem` as `online`.

If PM2 is not used on the staging server, use the team’s normal process manager to run `npm run start`; the important requirement is that it starts with the `.env.production` values above.

## Part 4 — check the staging URLs (technical person)

Open these URLs from a browser outside the server:

1. `https://driver.staging.your-company.example/api/mobile/v1/health` — expected JSON with `status: healthy`.
2. `https://driver.staging.your-company.example/m/driver` — expected Jaya Logistics Driver sign-in screen.
3. `https://driver.staging.your-company.example/admin` — expected **404**, not the ERP dashboard.

If item 3 opens the ERP, stop. The dedicated IIS driver hostname is not isolated correctly.

## Part 5 — build Android test APK (technical person)

On a machine with Android Studio, Android SDK Platform 35, and JDK 17:

```powershell
cd "D:\path\to\Jaya-logistics_v02"
$env:DRIVER_APP_URL = "https://driver.staging.your-company.example"
npm run mobile:driver:verify
cd mobile\driver
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

Install the generated debug APK from:

`mobile\driver\android\app\build\outputs\apk\debug\app-debug.apk`

## Part 6 — first complete test, entirely through screens

### Office setup

1. Log into the **normal ERP hostname** as an account with Tracking Plan edit permission.
2. Open **Vehicle Tracking Plan** → **Set up driver mobile access**.
3. At the top, confirm **Mobile deployment status: Ready for staging setup**.
4. In **Create driver**, enter a test name, the test driver’s mobile number, and a temporary PIN.
5. In **Assign loading to driver**, select one test Loading Info and the test driver, then select **Assign trip**.

The Loading Info must use the same driver mobile number. If not, correct the test data first; the assignment guard is intended to block a mismatch.

### Driver phone setup

1. Open the Android app (or, for the first non-GPS check, open `/m/driver` in a private browser).
2. Sign in with the mobile number and temporary PIN.
3. The first sign-in says the device is waiting for approval. This is expected.
4. Return to the ERP **Driver mobile setup** page, find the pending phone, and click **Approve**.
5. On the driver phone, press **Refresh approval**. Only the assigned trip must appear.

### Live GPS check

1. In the Android app, open the trip and press **Start trip**.
2. Allow precise location, notifications, and background location (choose **Allow all the time** in Android Settings when requested).
3. Confirm the persistent tracking notification appears.
4. Move with the phone for several minutes, then in normal ERP open **Vehicle Tracking Plan**, choose the same Loading Info, and press **Refresh GPS**.
5. Confirm the Driver live status card becomes **active**, shows a recent update, and the vehicle marker appears on the map.

## Part 7 — essential negative checks

1. Sign in as a different test driver: they must not see the first driver’s trip.
2. On the dedicated driver hostname, open `/admin`: it must be 404.
3. Turn off phone data briefly while moving, then turn it back on: the location should update later after the offline queue sends it.
4. In ERP, revoke the test device: further mobile calls from that phone should fail.
5. Cancel the mobile trip from **Driver mobile setup**: tracking stops, but the original Loading Info remains unchanged.

## Rollback

If any mobile test fails, set `DRIVER_MOBILE_ENABLED=false` in `.env.production`, restart the application process, and keep normal ERP use running. The existing ERP workflow does not depend on the driver-mobile feature.
