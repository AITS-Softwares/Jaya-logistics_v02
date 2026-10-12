import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import mongoose from "mongoose";
import connectDb from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { activeOperatingCompanyId, companyScopeFilter } from "@/lib/companyScope";
import AdvancePayment from "../AdvancePayment";
import PurchasePanel from "../../purchase-panel/PurchasePanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeUploadPath(value) {
    if (typeof value !== "string") return "";
    const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "");
    return normalized.startsWith("uploads/") && !normalized.includes("..") ? normalized : "";
}

function contentTypeFor(filename) {
    const types = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    };
    return types[path.extname(filename).toLowerCase()] || "application/octet-stream";
}

async function readStoredUpload(relativePath) {
    const locations = [
        path.join(process.cwd(), "public", relativePath),
        path.join(process.cwd(), relativePath),
    ];
    let missing;
    for (const location of locations) {
        try {
            return await readFile(location);
        } catch (error) {
            if (error?.code !== "ENOENT") throw error;
            missing = error;
        }
    }
    throw missing;
}

function canUseAdvancePayment(user) {
    if (!user) return false;
    if (user.type === "company") return true;
    if (user.roles?.includes("Admin")) return true;
    return !!user.modules?.["Advance Payment"]?.selected;
}

export async function GET(req) {
    try {
        const token = getTokenFromHeader(req);
        if (!token) return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
        const user = verifyJWT(token);
        if (!user) return NextResponse.json({ success: false, message: "Invalid session." }, { status: 401 });
        activeOperatingCompanyId(user);
        if (!canUseAdvancePayment(user)) {
            return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const requestedPath = normalizeUploadPath(searchParams.get("path"));
        const purchaseId = searchParams.get("purchaseId") || "";
        const paymentId = searchParams.get("paymentId") || "";
        if (!requestedPath) {
            return NextResponse.json({ success: false, message: "Invalid attachment request." }, { status: 400 });
        }

        await connectDb();

        // The path must belong to the purchase or payment record the caller names
        let owner = null;
        if (mongoose.Types.ObjectId.isValid(paymentId)) {
            owner = await AdvancePayment.findOne(companyScopeFilter(user, { _id: paymentId })).lean();
        } else if (mongoose.Types.ObjectId.isValid(purchaseId)) {
            owner = await PurchasePanel.findOne(companyScopeFilter(user, { _id: purchaseId })).lean();
        }
        if (!owner || normalizeUploadPath(owner?.memoFile?.filePath) !== requestedPath) {
            return NextResponse.json({ success: false, message: "Attachment not found." }, { status: 404 });
        }

        const file = await readStoredUpload(requestedPath);
        const filename = path.basename(requestedPath).replace(/[\r\n"\\]/g, "_");
        return new NextResponse(file, {
            headers: {
                "Content-Type": contentTypeFor(filename),
                "Content-Disposition": `inline; filename="${filename}"`,
                "Cache-Control": "private, no-store",
            },
        });
    } catch (error) {
        if (error?.code === "ENOENT") {
            return NextResponse.json({ success: false, message: "Attachment file is no longer available." }, { status: 404 });
        }
        console.error("GET /Advance-Payment/attachment error:", error);
        return NextResponse.json({ success: false, message: "Unable to open attachment." }, { status: 500 });
    }
}