import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const warnings = [];

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const dependencies = packageJson.dependencies || {};
const capacitorPackages = [
  "@capacitor/cli",
  "@capacitor/core",
  "@capacitor/android",
  "@capacitor/status-bar",
];

for (const name of capacitorPackages) {
  const version = dependencies[name];
  if (!version) {
    errors.push(`${name} is missing from dependencies.`);
    continue;
  }
  if (!version.includes("7.")) errors.push(`${name} must use the approved Capacitor 7.x baseline; found ${version}.`);
}

const configPath = path.join(root, "mobile", "driver", "capacitor.config.ts");
if (!fs.existsSync(configPath)) errors.push("Driver Capacitor configuration is missing.");

const driverUrl = process.env.DRIVER_APP_URL || "";
if (!driverUrl) {
  errors.push("DRIVER_APP_URL is required. Set it to the public HTTPS driver hostname before syncing or building a driver APK.");
} else {
  try {
    const parsed = new URL(driverUrl);
    if (parsed.protocol !== "https:") errors.push("DRIVER_APP_URL must use HTTPS.");
    if (parsed.hostname === "localhost" || parsed.hostname.endsWith(".local") || /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(parsed.hostname)) {
      errors.push("DRIVER_APP_URL must be publicly reachable; private, localhost, and office-network addresses are not valid release targets.");
    }
    if (parsed.hostname === "driver.invalid" || parsed.hostname === "example.com") errors.push("DRIVER_APP_URL is still a placeholder.");
  } catch {
    errors.push("DRIVER_APP_URL is not a valid URL.");
  }
}

if (fs.existsSync(path.join(root, "android", "release-key.jks"))) {
  warnings.push("A legacy Android keystore exists under android/. Do not reuse it for the new driver identity until IT confirms key ownership and recovery access.");
}

for (const message of warnings) console.warn(`WARNING: ${message}`);
for (const message of errors) console.error(`ERROR: ${message}`);

if (errors.length) process.exit(1);
console.log("Driver mobile foundation check passed.");
