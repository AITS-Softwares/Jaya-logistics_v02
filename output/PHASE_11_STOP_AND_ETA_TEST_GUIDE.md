# Phase 11 — Stop Intelligence and Controlled ETA Baseline

## What this phase does

The system now detects a **sustained stationary period** when GPS points remain close together and report very low speed for at least 10 minutes. It is an operational hint only.

It does **not** mark a delivery stop as complete, change the driver’s trip state, change the Loading Info, or reroute the vehicle. The driver’s own trip action remains the source of truth.

The ERP also supports a dispatcher-approved ETA baseline. It uses the route already calculated on the existing Tracking Plan page. GPS cannot silently replace the route or automatically promise a new delivery time.

## Later testing steps

1. Follow the Phase 8 staging guide through driver setup and live Android GPS tracking.
2. In normal ERP, open **Vehicle Tracking Plan** and select the driver’s Loading Info.
3. Keep the phone stationary with location tracking active for at least 10 minutes.
4. Click **Refresh GPS** in the ERP.
5. In **Driver live status**, check **Operational stop**. It should show a stationary duration and confidence percentage.
6. Move the phone again and wait for a new GPS point. The active operational stop should clear on the next update.
7. Wait for the existing map/route calculation to complete on Tracking Plan.
8. In the Driver live status card, click **Approve current route baseline**.
9. Confirm that **Delivery ETA** changes from `Not shown` to `Baseline available`.

## Important interpretation

- A stationary hint may be traffic, fuel, meal, waiting, or another ordinary pause. It is not proof of a delivery stop.
- Use the driver’s explicit **Arrived** and **Delivered** actions to confirm delivery progress.
- The approved baseline is a controlled planning reference, not an automatic reroute or guaranteed ETA.
