import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const auth = read("src", "lib", "driverMobileAuth.js");
const refresh = read("src", "app", "api", "mobile", "v1", "auth", "refresh", "route.js");
const registration = read("src", "app", "api", "mobile", "v1", "devices", "register", "route.js");
const app = read("src", "app", "m", "driver", "DriverApp.jsx");

assert.match(auth, /DEVICE_RELEASED/);
assert.match(auth, /DEVICE_REASSIGNED/);
assert.match(refresh, /This phone was released by dispatch/);
assert.match(refresh, /This phone is now linked to another driver/);
assert.match(registration, /registrationState/);
assert.match(registration, /This phone is linked to another driver/);
assert.match(app, /registration\.registrationState === "reassigned"/);
assert.match(app, /DEVICE_RELEASED/);
assert.match(app, /DEVICE_REASSIGNED/);

console.log("Driver mobile Phase 16 driver phone-status messaging passed.");
