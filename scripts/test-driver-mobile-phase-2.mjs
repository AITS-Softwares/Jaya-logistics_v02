import assert from "node:assert/strict";
import {
  canApplyDriverAction,
  driverActionNamesForState,
  driverSafeTripDto,
  normalizeDriverMobile,
} from "../src/lib/driverMobileCore.mjs";

assert.equal(normalizeDriverMobile("98765 43210"), "+919876543210");
assert.equal(normalizeDriverMobile("+1 415 555 2671"), "+14155552671");
assert.equal(normalizeDriverMobile("123"), "");
assert.equal(canApplyDriverAction("assigned", "START_TRIP"), true);
assert.equal(canApplyDriverAction("assigned", "DELIVER"), false);
assert.equal(canApplyDriverAction("delivered", "COMPLETE"), true);
assert.deepEqual(driverActionNamesForState("in_transit").sort(), ["ACKNOWLEDGE", "ARRIVE_STOP", "AT_PICKUP", "DELIVER", "REPORT_ISSUE"].sort());
const dto = driverSafeTripDto({ _id: "trip-1", state: "assigned", loadingReference: "L-1", vehicle: { vehicleNo: "MH01AB1234" }, routeSnapshot: { stops: [{ sequence: 1, type: "pickup", label: "Origin", address: "Safe address", internalOnly: "never leak" }] } });
assert.equal(dto.id, "trip-1");
assert.equal(dto.stops[0].internalOnly, undefined);
assert.deepEqual(dto.allowedActions.sort(), ["ACKNOWLEDGE", "START_TRIP", "REPORT_ISSUE"].sort());
console.log("Driver mobile Phase 2 core tests passed.");
