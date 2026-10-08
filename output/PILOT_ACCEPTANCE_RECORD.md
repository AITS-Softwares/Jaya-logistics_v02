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
| GPS updates appear in Tracking Plan | Office |  |  |
| Offline queue syncs after data returns | Driver / Office |  |  |
| Stale/missing tracking alert and driver issue workflow work | Office |  |  |
| Stop hint and approved ETA baseline are understood correctly | Office |  |  |
| Device revoke and trip cancellation work without changing Loading Info | Office |  |  |
| Signed APK certificate matches company key-vault record | IT / Release owner |  |  |
| Feature-flag rollback leaves normal ERP functioning | Technical |  |  |

## Go / no-go decision

| Decision date | Decision owner | Pilot drivers/vehicles completed | Open high-severity issues | Decision (go / no-go) | Conditions |
|---|---|---|---|---|---|
|  |  |  |  |  |  |
