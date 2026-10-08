# Phase 9 — Mobile Trip Audit Timeline

## What is new

The ERP **Driver mobile setup** page now has a **History** button for every active mobile trip and every recently cancelled mobile trip.

It shows a read-only timeline of:

- dispatch assignment;
- driver trip actions, such as starting a trip or arriving at a stop;
- issue reports;
- tracking start and stop;
- dispatcher cancellation, including the reason.

This timeline is for operational support. It does not show driver credentials, token information, or raw GPS batches.

## How staff will use it later

1. In normal ERP, open **Vehicle Tracking Plan** → **Set up driver mobile access**.
2. Find the relevant assignment in **Active assigned trips**.
3. Click **History**.
4. Read the newest event first. It shows when the event occurred and whether the driver or dispatcher performed it.
5. Use **Close** to return to the setup screen.

For a cancelled assignment, find it under **Recent cancelled mobile trips** and select its loading/vehicle button to see the same timeline.

## What to verify during later testing

- After assigning a trip, history shows **trip assigned**.
- After the driver starts the trip, history shows **trip started** and **tracking started**.
- After the driver reports an issue, history shows the issue type and note.
- After a dispatcher cancels it, history shows **trip cancelled** with the reason.
- The timeline never changes the original Loading Info, LR, or vehicle data.
