import type { CapacitorConfig } from "@capacitor/cli";

// The value is intentionally not committed. A release build must point only
// to the dedicated driver hostname, never to the ERP hostname or localhost.
const configuredDriverUrl = process.env.DRIVER_APP_URL || "https://driver.invalid";
const driverUrl = new URL(configuredDriverUrl);
// The shell must always start at the isolated driver UI, never at the ERP
// landing page. DRIVER_APP_URL remains an origin so it can be switched to the
// production HTTPS endpoint without changing source code.
driverUrl.pathname = "/m/driver";
driverUrl.search = "";
driverUrl.hash = "";
const driverAppUrl = driverUrl.toString();
const driverHost = driverUrl.hostname;
// HTTP is permitted only for a controlled debug APK while infrastructure is
// being prepared. Never set this for a distributed pilot or production build.
const allowCleartextTesting = process.env.DRIVER_ALLOW_CLEARTEXT_TESTING === "true";

const config: CapacitorConfig = {
  appId: "com.jayalogistics.driver",
  appName: "Jaya Logistics Driver",
  webDir: "web",
  server: {
    url: driverAppUrl,
    cleartext: allowCleartextTesting,
    allowNavigation: [driverHost],
  },
};

export default config;
