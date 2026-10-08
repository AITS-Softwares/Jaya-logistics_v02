# Phase 1 Workbook - Driver Mobile Foundation

**Project:** Jaya Logistics Driver Mobile Application  
**Phase status:** Started  
**Purpose:** Freeze the operational rules, production boundary, consent policy and Capacitor release baseline before any driver API, mobile UI or GPS code is written.

## What has been verified from the current project

| Area | Verified finding | Phase 1 implication |
|---|---|---|
| ERP platform | Next.js 15 / React 18 with MongoDB/Mongoose | The driver system can use the existing backend/database, but requires a narrow mobile API surface. |
| Loading assignment data | `LoadingPanel` stores `companyId`, `vehicleArrivalNo`, `vehicleInfo.vehicleNo`, `driverName`, `driverMobileNo` and order rows | This is useful source data, but not a secure driver identity or immutable trip assignment. |
| Tracking Plan | It already builds consignor/consignee stops and has server-side Places/Routes integration | It can later display live driver position, but drivers must never call staff tracking APIs directly. |
| Existing mobile wrapper | Capacitor Android files already exist | It currently loads the full hosted ERP, so it is not suitable for a driver release as configured. |
| Android permissions | Current manifest declares `INTERNET` only | Location/background/foreground-service permissions are deliberately deferred to the tracking phase. |
| Capacitor versions | Core/Android are v7; CLI is v2.5 | Packages must be aligned before release work begins. |
| Production process | PM2 starts Next.js with `next start` on port 3000 | Driver access needs a public HTTPS domain/reverse-proxy route; the mobile APK must not depend on a dev server or office Wi-Fi. |

## Phase 1 objectives

1. Approve how a dispatch assignment becomes a driver trip.
2. Approve the driver trip lifecycle and exception rules.
3. Approve pilot GPS, stop, escalation, consent and retention policy.
4. Establish the driver production hostname and reverse-proxy boundary.
5. Establish the Capacitor release baseline, package identity and signing ownership.

## 1. Decision register

Complete this register in the Phase 1 workshop. Any item marked **Required** blocks Phase 2.

| ID | Decision | Recommended default | Owner | Status |
|---|---|---|---|---|
| D-01 | Pilot device ownership | Company-owned Android phone/tablet where possible; allow approved personal Android phones only if policy permits | Management / Operations | Required |
| D-02 | Driver login method | Mobile OTP plus device registration; optional 4-6 digit app PIN after first login | Operations / Management | Required |
| D-03 | Trip creator | Dispatcher creates the trip after vehicle and driver are final | Transport operations | Required |
| D-04 | Reassignment during trip | Dispatcher cancels/reassigns with a mandatory reason; never silently alters a started trip | Transport operations | Required |
| D-05 | Production hostname | `driver.<company-domain>` for driver UI/API; ERP remains on its current hostname | Deployment owner | Required |
| D-06 | Pilot scope | 5-10 drivers and real routes; choose one operating company/branch first | Operations | Required |
| D-07 | Multiple drops | Support ordered drops from the first pilot if normal operations require them | Operations | Required |
| D-08 | Raw GPS retention | 90 days initial; preserve trip events/summaries per approved company retention policy | Management / Legal/HR | Required |
| D-09 | Location consent owner | HR/legal-approved consent and privacy text; tracking active only during an active trip | Management / HR | Required |
| D-10 | Stop/escalation policy | Use pilot defaults below; review after 2-4 weeks of data | Operations | Required |
| D-11 | APK distribution | Controlled direct APK for pilot, signed release build, named update owner | IT / Operations | Required |
| D-12 | Release signing-key custodian | Two authorized custodians and secure backup location | IT / Management | Required |

## 2. Proposed trip lifecycle for approval

```text
assigned --Start Trip--> started --At Pickup--> at_pickup --Loaded/Depart--> in_transit
in_transit --Arrived at next stop--> at_stop --Continue--> in_transit
at_stop --Delivered--> delivered --Close--> completed
active state --dispatcher cancellation/reassignment--> cancelled
```

| State/action | Primary actor | Required facts | Rule for exceptions |
|---|---|---|---|
| Create trip | Dispatcher | Loading/LR, vehicle and DriverProfile exist | Cannot create two active trips for the same vehicle or driver without an override reason. |
| Start Trip | Driver | Assigned trip, approved device, consent and visible location-service readiness | Driver may report technical failure; dispatcher may hold/cancel trip. |
| At Pickup / Loaded | Driver | Active trip | GPS is captured as audit evidence; geofence mismatch warns, rather than blocking an exceptional pickup. |
| In transit | System + driver | Tracking session active | Loss of signal becomes `stale/offline queueing`, never an automatic delivery failure. |
| At Stop / Delivered | Driver | Active assigned trip | Outside geofence requires a reason; no silent bypass. |
| Complete | Driver or dispatcher per policy | Delivery event exists | Later POD/OTP can become mandatory; not part of Phase 1. |
| Cancel/reassign | Dispatcher | Reason + audit event | Active device session is told to stop tracking old trip. |

**Approval:** Operations must confirm whether the same driver/vehicle may have multiple active loading/LR records, and how those are represented as one trip or separate trips.

## 3. Pilot tracking and alert policy

These are configurable server-side defaults, not permanent hard-coded business rules.

| Setting | Pilot default | Review question |
|---|---:|---|
| Moving sampling/upload | 30 seconds or 100 m | Does this give useful route visibility without unacceptable battery usage? |
| Slow movement | 60 seconds or 100 m | Is urban traffic visible enough? |
| Suspected stationary point | 10 minutes inside 100 m | Does it misclassify traffic/tolls? |
| Driver confirmation prompt | 15 minutes | Is the wording/language simple enough? |
| Dispatcher alert | 30 minutes unconfirmed | Who receives it and in what channel? |
| Critical escalation | 45-60 minutes/high-risk pattern | Who calls the driver and records outcome? |
| Pickup/customer geofence | 200 m initial | Which sites need larger geofences? |
| Overnight sampling | 15 minutes | Is this sufficient for security/operations? |
| Raw point retention | 90 days | Confirm with privacy, customer and dispute requirements. |
| Latest-location stale rule | To be calibrated in pilot | Use different thresholds for moving, stopped and overnight states. |

## 4. Data source and visibility mapping

| Driver-mobile field | Current/project source | Snapshot at trip assignment? | Driver may view? | Open decision |
|---|---|---:|---:|---|
| Loading reference | `LoadingPanel.vehicleArrivalNo` | Yes | Yes | Confirm business label displayed to drivers. |
| LR number(s) | Consignment Note | Yes | Yes | Confirm one/many LR relation. |
| Vehicle number | Loading/Vehicle master | Yes | Yes | Confirm vehicle master ID requirement. |
| Driver name/mobile | Loading fields initially; `DriverProfile` later | Name snapshot | Own data only | Driver profile onboarding owner. |
| Pickup address | LR consignor / approved loading point | Yes | Yes | Confirm fallback when LR does not exist. |
| Drop address/order | LR consignee / loading order rows | Yes | Yes | Confirm multi-drop sequence owner. |
| Party/customer contact | Approved DTO only | Yes | Need-to-know only | Select permitted phone/name fields. |
| Item/quantity | LR/order rows | Yes | Need-to-know only | Confirm whether driver needs it. |
| Commercial rate/margin | ERP records | No | **No** | Explicitly excluded. |
| Route/ETA | Server calculation | Live + snapshot | Yes | Delay buffer and communication rules. |

## 5. Production boundary and deployment checklist

### Target topology

```text
Driver APK over mobile data
  -> https://driver.<company-domain>/m/driver/*
  -> https://driver.<company-domain>/api/mobile/v1/*
  -> reverse proxy -> existing Next.js / PM2 application
  -> private MongoDB

ERP staff browser
  -> current ERP hostname -> existing ERP routes/APIs
```

### Required deployment checks

- [ ] DNS for `driver.<company-domain>` is owned and can point to the production reverse proxy.
- [ ] Valid HTTPS certificate automatically renews.
- [ ] Reverse proxy allows only driver UI, mobile API and required `/_next/` static assets on the driver hostname.
- [ ] Reverse proxy blocks staff ERP pages and legacy ERP APIs on the driver hostname.
- [ ] `driver.<company-domain>` works from an Android phone on mobile data with office Wi-Fi disabled.
- [ ] No private database port is internet-exposed.
- [ ] Production Next.js instance is always-on under PM2 and has an agreed log/rollback owner.
- [ ] A synthetic health URL and monitoring alert exist for the driver hostname.
- [ ] Test and production domains/environment variables cannot be confused in a release APK.

## 6. Capacitor release-baseline checklist

- [ ] Decide the Android application ID, e.g. `com.jayalogistics.driver`.
- [ ] Decide the user-facing app name and branded launcher icon.
- [ ] Upgrade/alignment plan brings Capacitor CLI, core and Android to a compatible supported major version.
- [ ] Release keystore exists, is access-controlled, backed up, and has two named custodians.
- [ ] Version-code/version-name policy is documented.
- [ ] Development, test and production driver-host values are separated.
- [ ] Release configuration uses HTTPS only; `cleartext` is disabled unless an explicitly approved local-development configuration needs it.
- [ ] The app uses a unique driver identity—not the existing ERP APK package identity.
- [ ] APK distribution/update owner and support channel are assigned for the pilot.

## 7. Consent and operational readiness checklist

- [ ] HR/legal approves plain-language tracking disclosure in English and required driver languages.
- [ ] Disclosure states: purpose, active-trip scope, visible notification, GPS/event retention, support contact, and what happens if permission is disabled.
- [ ] Operations defines the driver onboarding script: permission grant, battery setting, charger/mount, what to do if tracking health is red.
- [ ] Operations defines dispatcher SOP for: stale tracking, unexplained stop, issue report, device replacement, and emergency escalation.
- [ ] Pilot drivers are told not to disable the persistent tracking notification during an active trip.
- [ ] Pilot devices have charger/mount/network expectations documented.

## End-of-phase review and checking steps

Run this review before authorizing Phase 2. The reviewer should mark each item Pass, Fail, or Not Applicable; a Fail on any blocking item prevents Phase 2 start.

### A. Workshop and business-rule review

1. Read the approved lifecycle from `assigned` to `completed` and simulate these cases aloud:
   - normal pickup and one delivery;
   - multi-drop delivery;
   - driver/device replacement before start;
   - cancellation after tracking starts;
   - no signal during a long halt;
   - a driver forgets to report a break.
2. Confirm one named person/role owns each transition and escalation.
3. Confirm no mobile action can expose commercial rate/margin or unrelated customer/ERP data.
4. Confirm Operations approves all selected pilot thresholds or records the exception.
5. Confirm HR/legal approves the consent wording, tracking scope and retention period.

### B. Data-readiness review

1. Take five real representative Loading Info records: one single-drop, one multi-drop, one without an LR, one with an LR, and one reassignment/cancellation example if available.
2. Fill the mapping table for each record: loading ref, LR, vehicle, driver identity, pickup, drops and sequence.
3. Check whether driver mobile numbers are complete, unique enough for OTP sign-in, and correctly associated with intended drivers.
4. Identify every missing/ambiguous source field and decide whether to fix source data or define a manual dispatcher step.
5. Sign off the `DriverTrip` creation point and snapshot rule.

### C. Network and deployment review

1. From a non-office mobile-data connection, resolve and open `https://driver.<company-domain>/health` (or provisional health endpoint).
2. Verify TLS certificate validity, redirect behaviour, and no HTTP/cleartext fallback.
3. Attempt to open a staff ERP URL using the driver hostname; it must be rejected/blocked.
4. Attempt to call a legacy ERP API using the driver hostname; it must be rejected/blocked.
5. Verify the PM2/Next process restart and rollback procedure in a non-production or approved maintenance window.
6. Verify application logs contain no secret values and monitoring alerts reach the designated support owner.

### D. Capacitor baseline review

1. Run `npm ls @capacitor/cli @capacitor/core @capacitor/android` and record the compatible resolved versions.
2. Confirm the driver application ID differs from the current `com.pankajal.importexport` identity.
3. Confirm the release keystore custodian, backup location, and APK update owner.
4. Confirm the driver release configuration contains only the driver production hostname and uses HTTPS.
5. Build and install a harmless smoke-test APK on one Android test device; turn Wi-Fi off and confirm it can open the driver hostname through mobile data. No GPS permission/tracking test belongs to this phase.

### E. Go/no-go decision

Phase 1 passes only when all of these are true:

- [ ] D-01 through D-12 have a named owner and an approved/resolved value.
- [ ] Trip lifecycle and exceptional flows have operations sign-off.
- [ ] Pilot tracking/consent/retention policy has management/HR/legal sign-off.
- [ ] Representative ERP data can form unambiguous driver trips.
- [ ] A secure driver hostname works from external mobile data and does not expose the ERP surface.
- [ ] Capacitor versions, unique app identity and signing ownership are agreed.
- [ ] A documented rollback path exists.

If all checks pass, create Phase 2 work items in this order: mobile authorization helper, DriverProfile/DriverDevice/DriverTrip models, mobile-auth APIs, trip DTOs, API tests, then feature-flagged deployment.

## Phase 1 review record

| Review date | Participants | Result | Blocking items | Approved Phase 2 start date |
|---|---|---|---|---|
| _To be completed_ | _To be completed_ | Pass / Conditional / Fail | _To be completed_ | _To be completed_ |
