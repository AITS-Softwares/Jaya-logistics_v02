import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const driverApp = read("src", "app", "m", "driver", "DriverApp.jsx");
const auth = read("src", "lib", "driverMobileAuth.js");
const deviceAdmin = read("src", "app", "api", "mobile", "v1", "admin", "devices", "[deviceId]", "route.js");
const nativePlugin = read("mobile", "driver", "android", "app", "src", "main", "java", "com", "jayalogistics", "driver", "DriverTrackingPlugin.java");
const secureStore = read("mobile", "driver", "android", "app", "src", "main", "java", "com", "jayalogistics", "driver", "SecureTrackingStore.java");
const reapprovalRoute = read("src", "app", "api", "mobile", "v1", "devices", "reapproval", "route.js");

assert.match(nativePlugin, /loadDriverSession/);
assert.match(nativePlugin, /saveDriverSession/);
assert.match(secureStore, /EncryptedSharedPreferences/);
assert.match(driverApp, /loadNativeDriverSession/);
assert.match(driverApp, /saveNativeDriverSession/);
assert.match(driverApp, /Request approval again/);
assert.match(reapprovalRoute, /device\.status = "pending"/);
assert.match(auth, /mobileRefreshFailureCode/);
assert.match(deviceAdmin, /ACTIVE_PHONE_TRACKING/);
assert.match(deviceAdmin, /TrackingSession\.exists/);
assert.doesNotMatch(driverApp, /localStorage\.setItem\([^\n]*refreshToken/);

console.log("Driver mobile Phase 14 production safeguards passed.");
