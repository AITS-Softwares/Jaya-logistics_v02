# Phase 7 — Dispatcher Trip Control

## What this phase adds

The **Driver mobile setup** page now lets an authorised dispatcher cancel an active mobile trip safely.

Use this only when a mobile trip was assigned to the wrong driver or vehicle, or when the driver will not continue the journey in the mobile app.

Cancelling a mobile trip:

- requires a reason;
- changes only the mobile `DriverTrip` to **cancelled**;
- ends any active mobile tracking session;
- writes an auditable `trip_cancelled` event with the dispatcher and reason;
- does **not** edit, cancel, or delete the original ERP Loading Info, LR, vehicle, or financial record.

## Later steps for office staff

1. Open **Vehicle Tracking Plan**.
2. Click **Set up driver mobile access**.
3. Find the assignment in **Active assigned trips**.
4. Click **Cancel trip**.
5. Enter a clear reason, for example: `Vehicle changed before dispatch`.
6. Read the success message and click **Refresh**.

Expected result:

- The trip disappears from **Active assigned trips**.
- The driver cannot progress that cancelled trip.
- Any active tracking for that trip stops.
- The normal ERP Loading Info remains unchanged.

To continue with the correct driver/vehicle, first make the normal ERP Loading Info correction if needed, then create a new mobile assignment through **2. Assign loading to driver**.

## Important rule

Do not use **Cancel trip** merely to pause a delivery. It is an operational correction, not a temporary pause button. The normal driver flow should be used for a real delivery that is still continuing.
