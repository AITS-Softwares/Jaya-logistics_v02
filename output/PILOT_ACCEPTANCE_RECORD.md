# Driver Mobile Pilot Acceptance Record

Complete one row per tested phone/trip combination. Keep this record with the release evidence; do not put driver PINs, tokens, secrets, or screenshots containing sensitive customer information in it.

| Date | Tester | Phone model / Android | App version | Driver/vehicle test reference | Result | Notes / issue ID |
|---|---|---|---|---|---|---|
|  |  |  |  |  | Pass / Fail |  |

## Required pilot checks

| Check | Owner | Pass/Fail | Notes |
|---|---|---|---|
| Dedicated driver hostname opens driver UI; `/admin` is 404 | Technical |  |  |
| Unenrolled driver cannot sign in during pilot mode | Technical / Office |  |  |
| Enrolled driver signs in, device approval works, only assigned trip appears | Office / Driver |  |  |
| Tracking notification remains visible while trip is active | Driver |  |  |
| Android Location switched off with permissions granted blocks Start Trip | Driver / Technical |  |  |
| Starting with Location on shows Waiting for GPS until a usable fix is captured | Driver / Technical |  |  |
| Sign-out, locked screen, and token expiry leave active tracking running | Driver / Office |  |  |
| Reopen after Android process death or reboot and verify the same active session resumes | Driver / Technical |  |  |
| GPS updates appear in Tracking Plan | Office |  |  |
| Offline queue syncs after data returns | Driver / Office |  |  |
| Offline points stay with the original trip; queued actions sync once or report a conflict | Driver / Office |  |  |
| Multi-drop completion requires every drop to be delivered or resolved by dispatch | Driver / Office |  |  |
| Configured geofence checks arrival and records dispatcher override with a reason | Driver / Office |  |  |
| Server completion or cancellation ends phone tracking after the next check-in | Driver / Office |  |  |
| Stale/missing tracking alert and driver issue workflow work | Office |  |  |
| Stop hint and approved ETA baseline are understood correctly | Office |  |  |
| Device revoke and trip cancellation work without changing Loading Info | Office |  |  |
| Signed APK certificate matches company key-vault record | IT / Release owner |  |  |
| Feature-flag rollback leaves normal ERP functioning | Technical |  |  |

## Go / no-go decision

| Decision date | Decision owner | Pilot drivers/vehicles completed | Open high-severity issues | Decision (go / no-go) | Conditions |
|---|---|---|---|---|---|
|  |  |  |  |  |  |
