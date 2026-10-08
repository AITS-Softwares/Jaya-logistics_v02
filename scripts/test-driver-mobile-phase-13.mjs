import assert from "node:assert/strict";
import { driverMobileRolloutMode, isDriverAllowedInRollout, pilotMobileAllowList } from "../src/lib/driverRollout.mjs";

const allowList = pilotMobileAllowList("9876543210, +91 91234 56789");
assert.equal(driverMobileRolloutMode("pilot"), "pilot");
assert.equal(driverMobileRolloutMode("anything-else"), "production");
assert.equal(isDriverAllowedInRollout("9876543210", "pilot", allowList), true);
assert.equal(isDriverAllowedInRollout("9999999999", "pilot", allowList), false);
assert.equal(isDriverAllowedInRollout("9999999999", "production", allowList), true);
console.log("Driver mobile Phase 13 controlled-pilot tests passed.");
