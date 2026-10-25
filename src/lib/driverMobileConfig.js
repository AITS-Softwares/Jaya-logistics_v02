import crypto from "crypto";
import dbConnect from "@/lib/db";
import DriverMobileConfig from "@/models/DriverMobileConfig";
import { normalizeDriverMobile } from "@/lib/driverMobileCore.mjs";

function key() {
  const value = process.env.DRIVER_MOBILE_CONFIG_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!value) throw new Error("Driver mobile configuration encryption key is not configured");
  return crypto.createHash("sha256").update(value).digest();
}

export function encryptDriverMobileSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${ciphertext.toString("base64")}`;
}

export function decryptDriverMobileSecret(value) {
  if (!value) return "";
  const [ivText, tagText, ciphertext] = String(value).split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}

export function normalisePilotMobiles(values) {
  return [...new Set((Array.isArray(values) ? values : String(values || "").split(",")).map(normalizeDriverMobile).filter(Boolean))];
}

export async function getDriverMobileConfig(companyId, { includeSecret = false } = {}) {
  await dbConnect();
  const query = DriverMobileConfig.findOne({ companyId });
  if (includeSecret) query.select("+encryptedJwtSecret");
  return query;
}

export function publicDriverMobileConfig(config) {
  return {
    enabled: Boolean(config?.enabled), rolloutMode: config?.rolloutMode || "pilot",
    pilotMobiles: config?.pilotMobiles || [], movingIntervalSec: config?.movingIntervalSec || 30,
    minDistanceM: config?.minDistanceM || 100, secretConfigured: Boolean(config?.encryptedJwtSecret),
    updatedAt: config?.updatedAt || null, audit: (config?.audit || []).slice(-20).reverse(),
  };
}
