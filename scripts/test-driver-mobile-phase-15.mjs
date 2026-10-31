import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const model = read("src", "models", "DriverDevice.js");
const registration = read("src", "app", "api", "mobile", "v1", "devices", "register", "route.js");
const deviceAdmin = read("src", "app", "api", "mobile", "v1", "admin", "devices", "[deviceId]", "route.js");
const adminUi = read("src", "app", "(dashboard)", "admin", "Driver-Mobile", "page.jsx");

assert.match(model, /"unlinked"/);
assert.match(model, /assignmentHistory/);
assert.match(registration, /device\.status === "unlinked"/);
assert.match(registration, /device\.driverId = auth\.driver\._id/);
assert.match(registration, /status = "pending"/);
assert.match(deviceAdmin, /"unlink"/);
assert.match(deviceAdmin, /ACTIVE_TRIP_DEVICE_LOCKED/);
assert.match(deviceAdmin, /DriverTrip\.exists/);
assert.match(deviceAdmin, /device\.driverId = null/);
assert.match(adminUi, /Release phone/);

console.log("Driver mobile Phase 15 phone release and reassignment safeguards passed.");
