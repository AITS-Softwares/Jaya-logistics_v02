# Phase 6 — Staff Setup Workspace

## What changed

A new ERP screen is available at:

`/admin/Driver-Mobile`

It is linked from the existing **Tracking Plan** page as **Set up driver mobile access**. It uses the same existing Tracking Plan permissions and keeps normal Loading Info, LR, and ERP workflow unchanged.

The screen gives office staff one clear sequence:

1. Create a driver profile with name, mobile number and first PIN.
2. Assign one existing Loading Info record to that driver.
3. Approve the driver’s device after the driver signs in for the first time.
4. See assigned trips and move to Tracking Plan for live monitoring.

No driver PIN hash, installation identity, session token, or other mobile credential is returned to the ERP browser.

## Later test steps — no API tool required

Use these steps only after a technical person has deployed the system to a staging URL and enabled the driver-mobile feature flag.

### Part A — office setup

1. Log into the normal ERP using an account with **Tracking Plan** permission.
2. Open **Vehicle Tracking Plan**.
3. Click **Set up driver mobile access** under the title.
4. In **1. Create driver**, enter a test driver name, their ten-digit mobile number, and a temporary PIN of at least four characters. Click **Create driver**.
5. In **2. Assign loading to driver**, select a test Loading Info record and the new driver, then click **Assign trip**.

Important: the driver mobile number in Loading Info must be the same as the mobile number you entered for the new driver. If it differs, the system blocks the assignment to prevent the wrong person receiving a trip.

### Part B — driver’s first sign-in

1. On the driver phone, open the driver app or the staging URL ending in `/m/driver`.
2. Enter the mobile number and PIN created above.
3. The phone should show **waiting for approval**. This is expected and means the phone has safely registered.
4. Return to **Driver mobile setup** in ERP. The phone will appear in **3. Approve driver phone** with status **pending**.
5. Click **Approve** next to that phone.
6. On the phone, tap **Refresh approval**. The assigned trip should now appear.

### Part C — confirm the setup is correct

1. In ERP, the **Active assigned trips** table lists the test Loading Info and vehicle.
2. On the driver phone, only the assigned trip appears—there is no ERP sidebar, loading list, or other driver’s data.
3. In ERP, open **Vehicle Tracking Plan**, select the same loading, and confirm the **Driver live status** card identifies the driver and vehicle.
4. When Android GPS tracking is available, start the trip on the phone and use **Refresh GPS** on Tracking Plan to see the current update.

## If you are not ready to test yet

You do not need to do anything now. The safe next action for the technical/deployment person is to prepare a staging environment, enable the feature flag, and build the Android APK after installing Android Studio/JDK 17. Your office team can then use the three-part flow above without Postman, command line API calls, or database access.
