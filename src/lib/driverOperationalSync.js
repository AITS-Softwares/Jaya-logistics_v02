import DriverProfile from "@/models/DriverProfile";
import { normalizeDriverMobile } from "@/lib/driverMobileCore.mjs";

function clean(value, max = 120) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function cleanLicence(value) {
  return clean(value, 80).toUpperCase();
}

// This synchroniser is intentionally best-effort. VNN/Loading Info remains
// the system of record and must still save successfully if mobile-driver
// registration has a transient database problem.
export async function syncOperationalDriverProfile({ companyId, driverName, mobile, licenceNumber, source, sourceReference, createdBy }) {
  try {
    const mobileE164 = normalizeDriverMobile(mobile);
    if (!companyId || !mobileE164 || !["vnn", "loading"].includes(source)) return { outcome: "skipped" };
    const displayName = clean(driverName);
    const licenseNumber = cleanLicence(licenceNumber);
    const now = new Date();
    let driver = await DriverProfile.findOne({ companyId, mobileE164 });

    if (!driver && licenseNumber) {
      const licenceMatch = await DriverProfile.findOne({ companyId, licenseNumber });
      // Never silently replace an existing driver's login mobile number.
      if (licenceMatch && licenceMatch.mobileE164 !== mobileE164) {
        console.warn("driver operational sync skipped: licence is linked to another mobile", { companyId: String(companyId), source, sourceReference });
        return { outcome: "licence_mobile_conflict" };
      }
      driver = licenceMatch;
    }

    if (!driver) {
      driver = await DriverProfile.create({
        companyId,
        displayName: displayName || `Unverified driver (${mobileE164.slice(-4)})`,
        mobileE164,
        licenseNumber,
        registrationStatus: "draft",
        firstOperationalSource: source,
        lastOperationalSource: source,
        lastOperationalReference: clean(sourceReference),
        lastOperationalSyncAt: now,
        createdBy: createdBy || null,
      });
      return { outcome: "created_draft", driverId: String(driver._id) };
    }

    // Operational data may fill blanks but must not overwrite an administrator's
    // verified name or licence details.
    if (displayName && (!driver.displayName || driver.displayName.startsWith("Unverified driver ("))) driver.displayName = displayName;
    if (licenseNumber && !driver.licenseNumber) driver.licenseNumber = licenseNumber;
    if (!driver.firstOperationalSource) driver.firstOperationalSource = source;
    driver.lastOperationalSource = source;
    driver.lastOperationalReference = clean(sourceReference);
    driver.lastOperationalSyncAt = now;
    await driver.save();
    return { outcome: "matched", driverId: String(driver._id) };
  } catch (error) {
    console.error("driver operational sync failed:", error.message);
    return { outcome: "failed" };
  }
}
