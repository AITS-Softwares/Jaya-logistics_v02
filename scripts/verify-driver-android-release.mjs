import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const androidRoot = path.join(root, "mobile", "driver", "android");
const propertiesPath = path.join(androidRoot, "keystore.properties");
const errors = [];

const driverUrl = process.env.DRIVER_APP_URL || "";
if (!driverUrl) errors.push("DRIVER_APP_URL is required for a release build.");
else {
  try {
    if (new URL(driverUrl).protocol !== "https:") errors.push("DRIVER_APP_URL must use HTTPS for a release build.");
  } catch { errors.push("DRIVER_APP_URL is not a valid URL."); }
}
if (process.env.DRIVER_ALLOW_CLEARTEXT_TESTING === "true") errors.push("DRIVER_ALLOW_CLEARTEXT_TESTING must not be enabled for a release build.");

if (!fs.existsSync(propertiesPath)) {
  errors.push("android/keystore.properties is missing. Copy keystore.properties.example only on the controlled release machine.");
} else {
  const properties = Object.fromEntries(fs.readFileSync(propertiesPath, "utf8").split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith("#") && line.includes("="))
    .map((line) => { const index = line.indexOf("="); return [line.slice(0, index).trim(), line.slice(index + 1).trim()]; }));
  for (const key of ["storeFile", "storePassword", "keyAlias", "keyPassword"]) if (!properties[key] || properties[key].includes("replace-with")) errors.push(`Signing property ${key} is missing or still a template value.`);
  if (properties.storeFile) {
    const keyPath = path.isAbsolute(properties.storeFile) ? properties.storeFile : path.resolve(androidRoot, properties.storeFile);
    if (!fs.existsSync(keyPath)) errors.push("The configured release keystore file was not found.");
  }
}

const gradlePath = path.join(androidRoot, "app", "build.gradle");
const gradle = fs.existsSync(gradlePath) ? fs.readFileSync(gradlePath, "utf8") : "";
if (!gradle.includes("Release signing is required")) errors.push("The Android release build guard is missing.");
if (!gradle.includes("driverVersionCode") || !gradle.includes("driverVersionName")) errors.push("Version-code/name release overrides are missing.");

for (const error of errors) console.error(`ERROR: ${error}`);
if (errors.length) process.exit(1);
console.log("Driver Android release signing preflight passed. No keystore or password values were printed.");
