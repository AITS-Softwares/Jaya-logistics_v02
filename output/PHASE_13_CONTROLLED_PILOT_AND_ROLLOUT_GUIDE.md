# Phase 13 — Controlled Pilot Acceptance and Rollout

## What this phase adds

The driver mobile service now supports two rollout modes:

- `production` — every active driver profile may use the mobile app, subject to normal PIN/device/trip rules.
- `pilot` — only driver mobiles listed in `DRIVER_MOBILE_PILOT_MOBILES` may sign in or use an existing session.

For the first real-device pilot, always use `pilot` mode.

## Configure a controlled pilot

On the staging server, keep the Phase 8 variables and add:

```env
DRIVER_MOBILE_ENABLED=true
DRIVER_MOBILE_ROLLOUT_MODE=pilot
DRIVER_MOBILE_PILOT_MOBILES=+919876543210,+919123456789
```

Use only the 1–3 approved pilot driver mobile numbers. After changing the file, run the deployment preflight and restart the app process:

```powershell
node --env-file=.env.production scripts/verify-driver-mobile-deployment.mjs
pm2 startOrReload ecosystem.config.js --only importexportsystem --update-env
```

Expected result: the ERP **Driver mobile setup** status line shows `Rollout: pilot` and the number of configured pilot drivers.

## Pilot sequence

1. Complete the Phase 8 staging deployment and Android signed-release preparation.
2. Choose 1–3 real drivers, vehicles, and routes that represent normal use. Obtain their consent according to company policy.
3. Add only those drivers’ normalized mobile numbers to `DRIVER_MOBILE_PILOT_MOBILES`.
4. Follow the normal ERP setup flow: create driver, assign Loading Info, let the driver register phone, then approve that device.
5. Test the complete trip flow on each device: sign-in, trip actions, GPS, offline queue, stop/ETA display, alerts, revocation, cancellation, and rollback.
6. Record every result in [PILOT_ACCEPTANCE_RECORD.md](PILOT_ACCEPTANCE_RECORD.md).

## Required negative test

Create or use another active driver profile whose number is not in the pilot list. Attempt to sign in on `/m/driver`.

Expected: sign-in is rejected with pilot-access-not-enabled messaging. This confirms pilot scope is working.

## Go/no-go rules

Do not promote past pilot while there is an unresolved high-severity issue involving:

- unauthorised trip/data access;
- tracking data written to the wrong trip/driver;
- leaked credentials or signing material;
- inability to disable the mobile feature;
- a crash that prevents normal pilot-driver operation.

The release owner, operations owner, and security/IT owner should record a go/no-go decision in the acceptance record.

## Controlled production expansion

After a successful pilot, expand carefully:

1. Keep `DRIVER_MOBILE_ROLLOUT_MODE=pilot` and add a small new group of driver numbers.
2. Monitor the Operational exceptions panel and pilot record for at least one business cycle.
3. Repeat until operations and IT approve full availability.
4. Only then set `DRIVER_MOBILE_ROLLOUT_MODE=production`, restart the service, and document the decision.

## Immediate rollback

If a pilot issue requires an immediate stop:

```env
DRIVER_MOBILE_ENABLED=false
```

Restart the application process. Existing ERP screens and workflows continue to operate because the driver-mobile APIs are feature-flagged separately.
