# Driver APK download

The landing/sign-in page displays a QR linking to:
https://erp.jaya-groups.com/downloads/jaya-driver.apk

`public/downloads/jaya-driver.apk` is the current debug APK, copied from `mobile/driver/android/app/build/outputs/apk/debug/app-debug.apk`. It is deliberately distributable for testing and is not excluded by Git. Commit the public APK and QR along with the landing page changes, then deploy the ERP. Pushing alone does not publish the download unless deployment is automated.

After rebuilding the driver app, replace `public/downloads/jaya-driver.apk` with the new build before committing and deploying. Keep the same filename; the QR does not need to change. The download response uses the Android APK content type, attachment filename and no-store caching. No ERP login is required to download; app login and device approval still apply.

Local verification: copied APK SHA-256 matches the source, QR generated with the full HTTPS download URL, and landing JSX/download-header checks passed. Public URL and scanning on a real phone still need verification after deployment.
