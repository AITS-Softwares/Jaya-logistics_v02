# Jaya Logistics Driver Android Shell

This folder is a separate Capacitor project for the driver application. It is deliberately separate from the existing root `android/` project, which currently wraps the full ERP. Do not replace or sync the existing root Capacitor configuration for driver releases.

## Required release input

Set `DRIVER_APP_URL` to the public HTTPS driver hostname, for example `https://driver.company.example`. This hostname must expose only the planned driver UI and mobile API, not the ERP.

Before creating the Android project or building a release APK, run:

```powershell
$env:DRIVER_APP_URL = "https://driver.company.example"
npm run mobile:driver:verify
cd mobile/driver
npx cap add android
npx cap sync android
```

The hosted driver UI is now available at `/m/driver`. It is intentionally separate from the ERP dashboard and calls only `/api/mobile/v1/*` endpoints. The Android project and signing configuration remain deferred until the company hostname, signing-key custodian, and release owner are approved.

For Phase 3 browser testing, the driver application keeps access tokens only in memory. Do not treat this as a release-ready secure-storage implementation: Phase 4 will use an Android secure-storage/native bridge before any driver APK is distributed.
