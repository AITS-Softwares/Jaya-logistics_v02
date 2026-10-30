"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

const DriverTracking = registerPlugin("DriverTracking");

export function supportsNativeTracking() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function startNativeTracking({ tripId, sessionId, apiBaseUrl, accessToken, refreshToken, policy }) {
  if (!supportsNativeTracking()) return { available: false };
  return DriverTracking.start({ tripId, sessionId, apiBaseUrl, accessToken, refreshToken, policy });
}

export async function requestNativeTrackingPermissions() {
  if (!supportsNativeTracking()) return { ready: false, browserPreview: true };
  return DriverTracking.requestReadyPermissions();
}

export async function stopNativeTracking({ sessionId, reason }) {
  if (!supportsNativeTracking()) return { available: false };
  return DriverTracking.stop({ sessionId, reason });
}

export async function nativeTrackingHealth() {
  if (!supportsNativeTracking()) return { available: false, state: "browser_preview" };
  return DriverTracking.health();
}

export async function loadNativeDriverSession() {
  if (!supportsNativeTracking()) return { refreshToken: "" };
  return DriverTracking.loadDriverSession();
}

export async function saveNativeDriverSession(refreshToken) {
  if (!supportsNativeTracking() || !refreshToken) return;
  await DriverTracking.saveDriverSession({ refreshToken });
}

export async function clearNativeDriverSession() {
  if (!supportsNativeTracking()) return;
  await DriverTracking.clearDriverSession();
}

export async function nativeDriverDeviceInfo() {
  if (!supportsNativeTracking()) return { manufacturer: "Browser preview", model: navigator.platform || "Unknown", androidVersion: "", appVersion: "browser" };
  return DriverTracking.deviceInfo();
}
