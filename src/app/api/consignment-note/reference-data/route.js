import { withBranchAccess } from '@/lib/branchAccess';
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import connectDb from "@/lib/db";
import { companyScopeFilter } from "@/lib/companyScope";
import VehicleNegotiation from "@/app/api/vehicle-negotiation/VehicleNegotiation";
import LoadingPanel from "@/app/api/loading-panel/LoadingPanel";

/**
 * Downstream VNN lookup for Consignment Note.  Consignment users need the
 * vehicle and vendor selected for an order, but should not need access to the
 * Vehicle Negotiation module itself.
 */
const branchHandlerGET = withAuth(async (req, context, user) => {
  try {
    await connectDb();
    const url = new URL(req.url);
    if (url.searchParams.get("lookup") === "loadingInfoOrders") {
      const loadingInfos = await LoadingPanel.find(companyScopeFilter(user, { isDraft: { $ne: true }, panelStatus: { $ne: 'Draft' } }))
        .select("vehicleArrivalNo orderRows.orderNo")
        .lean();
      const orderNumbers = [...new Set(loadingInfos.flatMap((loadingInfo) =>
        (loadingInfo.orderRows || []).map((row) => row.orderNo?.trim()).filter(Boolean),
      ))];
      return NextResponse.json({ success: true, data: { orderNumbers } });
    }

    const orderNo = url.searchParams.get("orderNo")?.trim();

    if (!orderNo) {
      return NextResponse.json(
        { success: false, message: "Order number is required." },
        { status: 400 },
      );
    }

    const vehicleNegotiation = await VehicleNegotiation.findOne(
      companyScopeFilter(user, { "orders.orderNo": orderNo, panelStatus: { $ne: 'Draft' } }),
    )
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: { vehicleNegotiation },
    });
  } catch (error) {
    console.error("GET /api/consignment-note/reference-data error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load linked vehicle data." },
      { status: 500 },
    );
  }
}, { module: "Consignment Note", actions: ["create", "edit", "view"] });

export const GET = withBranchAccess(branchHandlerGET);
