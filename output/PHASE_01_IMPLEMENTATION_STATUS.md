# Phase 1 Implementation Status

## Completed repository changes

1. Standardized the Capacitor baseline on compatible Capacitor 7 packages:
   - `@capacitor/cli` 7.6.9
   - `@capacitor/core` 7.6.9
   - `@capacitor/android` 7.6.9
   - `@capacitor/status-bar` 7.0.6
2. Preserved the existing root `capacitor.config.json` and `android/` wrapper so the current ERP mobile wrapper is not changed or repackaged.
3. Added a separate `mobile/driver/` Capacitor project definition with a unique application identity: `com.jayalogistics.driver`.
4. Enforced HTTPS-only remote driver UI configuration and added a pre-sync/release verifier that rejects localhost, private-network and placeholder URLs.
5. Added an unauthenticated but non-sensitive health endpoint at `/api/mobile/v1/health` for the future driver subdomain/reverse-proxy health check.
6. Added documented commands for driver configuration validation, Android sync and Capacitor diagnostic checks.

## Intentionally not implemented in Phase 1

- Driver authentication, DriverProfile, DriverTrip, GPS collection, device registration, or ERP UI changes. These belong to Phase 2 onward.
- Android location/background permissions. They depend on the approved trip/consent policy and belong to Phase 4.
- DNS, TLS certificates, reverse-proxy rules, OTP provider configuration, device/MDM policy, signing-key custody and consent approval. These are company-operated external changes.

## Required operational closure

Set an actual public driver URL and execute:

```powershell
$env:DRIVER_APP_URL = "https://driver.<your-domain>"
npm run mobile:driver:verify
```

When it passes, the deployment administrator must configure `driver.<your-domain>` to route `/api/mobile/v1/health` to this Next.js deployment, then verify it with mobile data:

```powershell
Invoke-WebRequest https://driver.<your-domain>/api/mobile/v1/health
```

The expected JSON contains `success: true`, `service: "driver-mobile"`, and `status: "healthy"`.
