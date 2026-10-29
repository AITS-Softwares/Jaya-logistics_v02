const errors = [];
const warnings = [];
const driverUrl = process.env.DRIVER_APP_URL || "";
const configEncryptionKey = process.env.DRIVER_MOBILE_CONFIG_ENCRYPTION_KEY || "";

if (!process.env.MONGODB_URI) errors.push("MONGODB_URI is required by the Next.js application.");
if (configEncryptionKey.length < 32) errors.push("DRIVER_MOBILE_CONFIG_ENCRYPTION_KEY must be a server-only random secret of at least 32 characters. Mobile enablement, rollout, and signing secret are configured in Admin UI after deployment.");

if (!driverUrl) {
  errors.push("DRIVER_APP_URL is required and must be the public HTTPS driver hostname.");
} else {
  try {
    const url = new URL(driverUrl);
    if (url.protocol !== "https:") errors.push("DRIVER_APP_URL must use HTTPS.");
    if (url.pathname !== "/" || url.search || url.hash) errors.push("DRIVER_APP_URL must be an origin only, for example https://driver.staging.example.com.");
    if (url.hostname === "localhost" || url.hostname.endsWith(".local") || /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(url.hostname)) errors.push("DRIVER_APP_URL must be publicly reachable, not localhost or a private network address.");
  } catch { errors.push("DRIVER_APP_URL is not a valid URL."); }
}

if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY) warnings.push("NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY is absent; the ERP tracking map will show its existing fallback instead of Google Maps.");
if (!process.env.ROUTES_API_KEY && !process.env.GOOGLE_MAPS_SERVER_KEY) warnings.push("No route API key is configured; existing route distance/ETA planning will remain unavailable.");

for (const message of warnings) console.warn(`WARNING: ${message}`);
for (const message of errors) console.error(`ERROR: ${message}`);
if (errors.length) process.exit(1);
console.log("Driver mobile deployment preflight passed. No secrets were printed.");
