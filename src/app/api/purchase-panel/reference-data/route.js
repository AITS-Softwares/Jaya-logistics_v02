import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import connectDb from "@/lib/db";
import { companyScopeFilter } from "@/lib/companyScope";
import PurchasePanel from "../PurchasePanel";
import LoadingPanel from "@/app/api/loading-panel/LoadingPanel";
import VehicleNegotiation from "@/app/api/vehicle-negotiation/VehicleNegotiation";
import PricingPanel from "@/app/api/pricing-panel/PricingPanel";
import SubCompany from "@/models/SubCompany";

const selectableStatuses = ["Approved", "Completed"];

function loadingInfoReference(panel) {
  return {
    _id: panel._id,
    vehicleArrivalNo: panel.vehicleArrivalNo || "",
    vehicleNegotiationNo: panel.vehicleNegotiationNo || "",
    branch: panel.branchName || panel.branchCode || "",
    branchName: panel.branchName || "",
    branchCode: panel.branchCode || "",
    subCompanyId: panel.subCompanyId || "",
    subCompanyName: panel.subCompanyName || "",
    subCompanyCode: panel.subCompanyCode || "",
    vehicleNo: panel.vehicleInfo?.vehicleNo || "",
    driverNo: panel.vehicleInfo?.driverMobileNo || "",
    vehicleInfo: panel.vehicleInfo || {},
    orderRows: panel.orderRows || [],
  };
}

/**
 * Read-only downstream data for Purchase Panel users. This deliberately reads
 * scoped source records directly instead of requiring permissions for each
 * source module or its master-data endpoint.
 */
export const GET = withAuth(async (req, context, user) => {
  try {
    await connectDb();
    const url = new URL(req.url);
    const lookup = url.searchParams.get("lookup");
    const vehicleArrivalNo = url.searchParams.get("vehicleArrivalNo");
    const vnnNo = url.searchParams.get("vnnNo");

    if (lookup === "subcompanies") {
      const subCompanies = await SubCompany.find(
        { companyId: user.companyId, isActive: { $ne: false } },
        { name: 1, code: 1 },
      ).sort({ name: 1 }).lean();
      return NextResponse.json({ success: true, data: { subCompanies } });
    }

    if (vehicleArrivalNo || vnnNo) {
      const panelQuery = vehicleArrivalNo ? { vehicleArrivalNo } : { vehicleNegotiationNo: vnnNo };
      const loadingInfo = await LoadingPanel.findOne(
        companyScopeFilter(user, { ...panelQuery, panelStatus: { $in: selectableStatuses } }),
      ).lean();

      if (!loadingInfo) {
        return NextResponse.json({ success: false, message: "Approved Loading Info not found." }, { status: 404 });
      }

      const resolvedVnnNo = loadingInfo.vehicleNegotiationNo;
      const vehicleNegotiation = await VehicleNegotiation.findOne(
        companyScopeFilter(user, { vnnNo: resolvedVnnNo }),
      ).lean();

      const pricingQuery = vehicleNegotiation?._id
        ? { $or: [{ "orders.vehicleNegotiationId": vehicleNegotiation._id }, { "orders.vnnNumber": resolvedVnnNo }] }
        : { "orders.vnnNumber": resolvedVnnNo };
      const pricingPanel = await PricingPanel.findOne(companyScopeFilter(user, pricingQuery))
        .sort({ createdAt: -1 })
        .lean();

      return NextResponse.json({
        success: true,
        data: { loadingInfo, vehicleNegotiation, pricingPanel },
      });
    }

    const [loadingInfos, purchases] = await Promise.all([
      LoadingPanel.find(
        companyScopeFilter(user, { panelStatus: { $in: selectableStatuses } }),
      ).sort({ createdAt: -1 }).lean(),
      PurchasePanel.find(companyScopeFilter(user), { loadingInfoNo: 1 }).lean(),
    ]);

    const usedLoadingInfoNumbers = new Set(
      purchases.map((purchase) => purchase.loadingInfoNo).filter(Boolean),
    );
    const availableLoadingInfos = loadingInfos
      .filter((panel) => panel.vehicleNegotiationNo && !usedLoadingInfoNumbers.has(panel.vehicleArrivalNo))
      .map(loadingInfoReference);

    return NextResponse.json({ success: true, data: { loadingInfos: availableLoadingInfos } });
  } catch (error) {
    console.error("GET /api/purchase-panel/reference-data error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load Purchase Panel reference data." },
      { status: 500 },
    );
  }
}, { module: "Purchase Panel", actions: ["create", "edit", "view"] });
