import mongoose from "mongoose";

export const TRACKING_POLICY = {
  movingIntervalSec: 30,
  slowIntervalSec: 60,
  stationaryIntervalSec: 300,
  overnightIntervalSec: 900,
  minDistanceM: 100,
  maximumBatchPoints: 100,
  maximumBatchBytes: 256 * 1024,
  rawPointRetentionDays: 90,
  maximumPointAgeDays: 8,
  maximumFutureSkewMinutes: 15,
};

const number = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;

export function validateLocationPoint(point) {
  const latitude = number(point?.latitude);
  const longitude = number(point?.longitude);
  const accuracyM = number(point?.accuracyM);
  const sequence = Number(point?.sequence);
  const idempotencyKey = String(point?.idempotencyKey || "");
  const recordedAt = new Date(point?.recordedAt);
  const now = Date.now();
  if (latitude === null || latitude < -90 || latitude > 90 || longitude === null || longitude < -180 || longitude > 180) return { error: "Coordinates are invalid." };
  if (accuracyM === null || accuracyM < 0 || accuracyM > 10000) return { error: "Location accuracy is invalid." };
  if (!Number.isInteger(sequence) || sequence < 1) return { error: "Location sequence is invalid." };
  if (idempotencyKey.length < 12 || idempotencyKey.length > 120) return { error: "Location idempotency key is invalid." };
  if (Number.isNaN(recordedAt.getTime()) || recordedAt.getTime() < now - TRACKING_POLICY.maximumPointAgeDays * 86400000 || recordedAt.getTime() > now + TRACKING_POLICY.maximumFutureSkewMinutes * 60000) return { error: "Location timestamp is outside the accepted range." };
  const optionalNumber = (value, min, max) => value == null ? null : (number(value) !== null && number(value) >= min && number(value) <= max ? number(value) : undefined);
  const speedMps = optionalNumber(point.speedMps, 0, 120);
  const bearingDeg = optionalNumber(point.bearingDeg, 0, 360);
  const altitudeM = optionalNumber(point.altitudeM, -1000, 15000);
  const batteryPct = optionalNumber(point.batteryPct, 0, 100);
  if ([speedMps, bearingDeg, altitudeM, batteryPct].includes(undefined)) return { error: "An optional numeric location field is invalid." };
  return { value: {
    sequence, idempotencyKey, latitude, longitude, accuracyM, speedMps, bearingDeg, altitudeM, batteryPct,
    recordedAt, isCharging: typeof point.isCharging === "boolean" ? point.isCharging : null,
    networkType: String(point.networkType || "").slice(0, 32), provider: String(point.provider || "").slice(0, 32), isMocked: point.isMocked === true,
  } };
}

export function sameObjectId(left, right) {
  return left && right && String(left) === String(right);
}

export function isObjectId(value) {
  return mongoose.isValidObjectId(value);
}
