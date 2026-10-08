# Phase 10 — Operational Exceptions

## What this phase adds

The ERP **Driver mobile setup** page now has an **Operational exceptions** panel. It checks active mobile trips each time the page refreshes.

It can show:

- **Tracking missing** — a driver started a trip but no active tracking session exists.
- **Tracking stale** — an active session has not supplied a recent GPS update.
- **Driver issue** — the driver reported an issue, such as breakdown, traffic, fuel, or waiting.

Each alert belongs only to the company and trip that produced it. Office users can acknowledge it or resolve it. Resolving requires a note. GPS alerts clear automatically when healthy tracking resumes; driver issues remain until staff resolve them.

## Later testing steps

1. Follow the Phase 8 staging guide first: deploy, create a driver, assign a Loading Info, approve the device, and start a trip.
2. In ERP, open **Vehicle Tracking Plan** → **Set up driver mobile access** and press **Refresh**.
3. Before the driver grants GPS permission or starts tracking, a started trip should show **tracking missing**.
4. After the phone is tracking normally, press Refresh again. The tracking exception should disappear automatically.
5. In the driver app, use **Report an issue** and choose a type.
6. Return to the ERP screen and press Refresh. A **driver issue** exception should appear.
7. Click **Acknowledge** when someone is actively handling it.
8. Click **Resolve**, enter a short note such as `Replacement vehicle sent`, and confirm the exception disappears.
9. To test stale tracking, stop the phone’s data/location long enough for a stale GPS interval, refresh ERP, and confirm **tracking stale** appears. Restore tracking and refresh again; it should close automatically.

## Important operational rule

Resolving an exception records that office staff handled it; it does not alter the Loading Info, trip route, driver’s phone permissions, or original ERP transactions.
