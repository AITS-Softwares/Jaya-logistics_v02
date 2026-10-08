# Phase 12 — Android Release Packaging and Signing Readiness

## What is ready

- The driver Android app uses application ID `com.jayalogistics.driver`.
- Release version can be supplied without changing source code:
  - `-PdriverVersionCode=2`
  - `-PdriverVersionName=1.0.1`
- A release AAB/APK cannot be built unless controlled signing properties are present.
- The keystore and `keystore.properties` are ignored by Git.
- The repository contains only [keystore.properties.example](../mobile/driver/android/keystore.properties.example), which has no real secret.

## Important ownership rule

The production signing key is the company’s long-term Android identity. It must be created or held by an approved IT/release custodian, backed up in the company password/key vault, and never committed, copied into chat, or sent over email.

## One-time release-machine setup (technical/IT owner)

1. Install Android Studio, Android SDK Platform 35, and JDK 17 on the controlled release machine.
2. Set `JAVA_HOME` to the JDK, then verify it:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
java -version
```

3. Create a secure directory outside the repository, for example `C:\secure-release-keys`.
4. The approved key custodian creates the keystore there, or retrieves the existing approved keystore from the company vault. Example for a **new company-owned test/release identity**:

```powershell
keytool -genkeypair -v -keystore C:\secure-release-keys\jaya-logistics-driver-release.jks -alias jaya-logistics-driver -keyalg RSA -keysize 4096 -validity 10000
```

5. Copy `mobile\driver\android\keystore.properties.example` to `mobile\driver\android\keystore.properties`.
6. Replace its four values with the secure keystore path, passwords, and alias. Do not commit this copy.

## Build a testable signed release

First deploy the staging driver URL as described in Phase 8. Then, from the repository root:

```powershell
$env:DRIVER_APP_URL = "https://driver.staging.your-company.example"
npm run mobile:driver:verify
npm run mobile:driver:release:verify
cd mobile\driver
npx cap sync android
cd android
.\gradlew.bat bundleRelease -PdriverVersionCode=1 -PdriverVersionName=1.0.0
.\gradlew.bat assembleRelease -PdriverVersionCode=1 -PdriverVersionName=1.0.0
```

Expected artifacts:

- Play Store upload package: `app\build\outputs\bundle\release\app-release.aab`
- Sideload/QA package: `app\build\outputs\apk\release\app-release.apk`

## Verify the signed APK

Use the `apksigner` bundled with Android SDK Build Tools. The exact installed version folder may differ:

```powershell
& "$env:ANDROID_SDK_ROOT\build-tools\<version>\apksigner.bat" verify --verbose --print-certs app\build\outputs\apk\release\app-release.apk
```

Expected: verification succeeds and the certificate fingerprint matches the one stored in the company key vault.

## Later testing steps

1. Install the signed release APK on a clean Android test phone.
2. Confirm its name is **Jaya Logistics Driver** and it opens the staging driver sign-in page.
3. Complete the Phase 8 full test flow: driver creation, assignment, device approval, start trip, location permission, GPS, offline recovery, revoke, and cancellation.
4. Uninstall/reinstall the app. It must require sign-in/device approval again.
5. Confirm the app cannot open ERP `/admin` pages through its dedicated driver hostname.
6. Record device model, Android version, APK version, result, and tester in the pilot acceptance record.

## Before production publication

Do not publish until Phase 13 pilot acceptance is complete. For a Play Store release, use the AAB and retain the signing-key custody evidence and tested certificate fingerprint.
