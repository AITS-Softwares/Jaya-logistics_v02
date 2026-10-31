import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const profile = read("src", "models", "DriverProfile.js");
const driverApi = read("src", "app", "api", "mobile", "v1", "admin", "drivers", "[driverId]", "route.js");
const driverList = read("src", "app", "api", "mobile", "v1", "admin", "drivers", "route.js");
const page = read("src", "app", "(dashboard)", "admin", "Driver-Mobile", "Drivers", "page.jsx");

assert.match(profile, /mobileHistory/);
assert.match(driverApi, /archive_release_mobile/);
assert.match(driverApi, /reactivate_driver/);
assert.match(driverApi, /ACTIVE_DRIVER_TRIP/);
assert.match(driverApi, /DriverTrip\.exists/);
assert.match(driverApi, /device\.status = "unlinked"/);
assert.match(driverApi, /driver\.mobileE164 = `archived-/);
assert.match(driverList, /lastReleasedMobile/);
assert.match(page, /Archive & release mobile/);
assert.match(page, /Reactivate driver/);

console.log("Driver mobile Phase 17 account-retirement safeguards passed.");
