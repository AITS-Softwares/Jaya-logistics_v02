import type { CapacitorConfig } from "@capacitor/cli";

// The value is intentionally not committed. A release build must point only
// to the dedicated driver hostname, never to the ERP hostname or localhost.
const driverAppUrl = process.env.DRIVER_APP_URL || "https://driver.invalid";
const driverHost = new URL(driverAppUrl).hostname;

const config: CapacitorConfig = {
  appId: "com.jayalogistics.driver",
  appName: "Jaya Logistics Driver",
  webDir: "web",
  server: {
    url: driverAppUrl,
    cleartext: false,
    allowNavigation: [driverHost],
  },
};

export default config;
