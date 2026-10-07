// app/api/loading-panel/[id]/lr/route.js
//
// READ-ONLY lookup of the Consignment Note(s) (LR) created for a Loading Info.
//
// Loading Info users are not allowed to create or edit LRs, and they may not
// have any "Consignment Note" module access either. This endpoint therefore
// only requires the Loading Info "view" permission and can never write.
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDb from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { companyScopeFilter } from "@/lib/companyScope";
import LoadingPanel from "@/app/api/loading-panel/LoadingPanel";
import ConsignmentNote from "@/app/api/consignment-note/ConsignmentNote";
import { findLRsForPanel } from "../../findLRs";

export const runtime = "nodejs";

export const GET = withAuth(async (req, context, user) => {
    try {
        // Next.js 15 exposes dynamic route params asynchronously.
        const { id: panelId } = await context.params;
        if (!panelId || !mongoose.Types.ObjectId.isValid(panelId)) {
            return NextResponse.json({ success: false, message: "Valid Loading Info ID is required." }, { status: 400 });
        }

        await connectDb();

        const panel = await LoadingPanel.findOne(companyScopeFilter(user, { _id: panelId }))
            .select("vehicleArrivalNo consignmentNote orderRows.orderNo orderRows.to orderRows.toName orderRows.weight")
            .lean();
        if (!panel) {
            return NextResponse.json({ success: false, message: "Loading Info not found." }, { status: 404 });
        }

        const rowIds = (panel.orderRows || []).map((r) => String(r._id));
        const links = [];
        if (panel.vehicleArrivalNo) links.push({ loadingInfoNo: panel.vehicleArrivalNo });
        if (rowIds.length) links.push({ orderRowId: { $in: rowIds } });

        const notes = await findLRsForPanel(user, panel, {}, "-companyId -createdBy -updatedBy -__v");

        return NextResponse.json({
            success: true,
            data: {
                loadingInfoNo: panel.vehicleArrivalNo || "",
                // Primary LR number stored on the Loading Info (may be empty for old records).
                consignmentNote: panel.consignmentNote || notes[0]?.lrNo || "",
                generated: notes.length > 0,
                notes,
            },
        });
    } catch (error) {
        console.error("GET /api/loading-panel/[id]/lr error:", error);
        return NextResponse.json({ success: false, message: "Unable to load the Consignment Note." }, { status: 500 });
    }
}, { module: "Loading Info", action: "view" });