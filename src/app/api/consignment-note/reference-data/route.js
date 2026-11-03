import { isVnnReadyForDownstream } from '@/lib/vehicleNegotiationWorkflow';
import { withBranchAccess } from '@/lib/branchAccess';
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import connectDb from "@/lib/db";
import { companyScopeFilter } from "@/lib/companyScope";
import VehicleNegotiation from "@/app/api/vehicle-negotiation/VehicleNegotiation";

/**
 * Downstream VNN lookup for Consignment Note.  Consignment users need the
 * vehicle and vendor selected for an order, but should not need access to the
 * Vehicle Negotiation module itself.
 */
const branchHandlerGET = withAuth(async (req, context, user) => {
  try {
    await connectDb();
    const url = new URL(req.url);
    const eligibleFilter = { isDraft: { $ne: true }, panelStatus: { $nin: ['Draft', 'Cancelled'] }, 'approval.part3Status': 'Approved' };
    if (url.searchParams.get("lookup") === "vnnOrders") {
      const negotiations = await VehicleNegotiation.find(companyScopeFilter(user, eligibleFilter)).lean();
      const eligibleRows = negotiations.filter(isVnnReadyForDownstream).flatMap(vnn =>
        (vnn.orders || []).map(row => ({ orderNo: row.orderNo, orderRowId: row.orderRowId || '' })));
      return NextResponse.json({ success: true, data: { eligibleRows } });
    }

    const orderNo = url.searchParams.get("orderNo")?.trim();

    if (!orderNo) {
      return NextResponse.json(
        { success: false, message: "Order number is required." },
        { status: 400 },
      );
    }

    const candidates = await VehicleNegotiation.find(
      companyScopeFilter(user, { ...eligibleFilter, "orders.orderNo": orderNo }),
    ).sort({ updatedAt: -1 }).lean();
    const vehicleNegotiation = candidates.find(isVnnReadyForDownstream) || null;

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
