import { normalizeDriverMobile } from "@/lib/driverMobileCore.mjs";

const text = (value) => String(value || "").trim();
const join = (values) => [...new Set(values.map(text).filter(Boolean))].join(", ");

export function buildDriverTripSnapshot(loading, lrs = []) {
  const rows = Array.isArray(loading?.orderRows) ? loading.orderRows : [];
  const lrsForLoading = lrs.filter((lr) => text(lr.loadingInfoNo) === text(loading?.vehicleArrivalNo));
  const firstConsignor = lrsForLoading.find((lr) => text(lr?.consignor?.address));
  const pickupAddress = text(firstConsignor?.consignor?.address) || join([rows[0]?.plantName, rows[0]?.fromName || rows[0]?.from]);
  const pickupLabel = text(firstConsignor?.consignor?.name) || text(rows[0]?.plantName) || "Pickup";
  const stops = pickupAddress ? [{ sequence: 1, type: "pickup", label: pickupLabel, address: pickupAddress, city: text(rows[0]?.fromName || rows[0]?.from), pinCode: "" }] : [];

  rows.forEach((row, index) => {
    const lr = lrsForLoading.find((item) => text(item.orderRowId) === String(row?._id)) || lrsForLoading.find((item) => text(item?.header?.orderNo) === text(row?.orderNo));
    const consigneeAddress = text(lr?.consignee?.address);
    stops.push({
      sequence: stops.length + 1,
      type: "drop",
      label: text(lr?.consignee?.name) || text(row?.partyName) || `Drop ${index + 1}`,
      address: consigneeAddress || join([row?.toName || row?.to, row?.talukaName || row?.taluka, row?.districtName || row?.district, row?.stateName || row?.state, row?.pinCode]),
      city: text(row?.toName || row?.to),
      pinCode: text(row?.pinCode),
    });
  });

  return {
    loadingReference: text(loading?.vehicleArrivalNo),
    lrIds: lrsForLoading.map((lr) => lr._id),
    lrNumbers: lrsForLoading.map((lr) => text(lr.lrNo)).filter(Boolean),
    vehicle: { vehicleId: text(loading?.vehicleInfo?.vehicleId), vehicleNo: text(loading?.vehicleInfo?.vehicleNo) },
    driverMobile: normalizeDriverMobile(loading?.vehicleInfo?.driverMobileNo),
    routeSnapshot: { stops, plannedAt: new Date() },
  };
}
