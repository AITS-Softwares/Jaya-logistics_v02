import { normalizeDriverMobile } from "./driverMobileCore.mjs";

export function pilotMobileAllowList(value) {
  return new Set(String(value || "").split(",").map(normalizeDriverMobile).filter(Boolean));
}

export function driverMobileRolloutMode(value) {
  return String(value || "production").toLowerCase() === "pilot" ? "pilot" : "production";
}

export function isDriverAllowedInRollout(mobile, mode, allowedMobiles) {
  return driverMobileRolloutMode(mode) !== "pilot" || allowedMobiles.has(normalizeDriverMobile(mobile));
}
