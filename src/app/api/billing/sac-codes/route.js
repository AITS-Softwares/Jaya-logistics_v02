// src/app/api/billing/sac-codes/route.js
import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import SacCode from "@/models/SacCodeModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ── PERMISSION FUNCTIONS ──
function isAuthorized(user) {
    if (!user) return false;
    if (user.type === "company") return true;
    if (user.roles && user.roles.includes("Admin")) return true;

    const modules = user.modules || {};
    const moduleData = modules["Billing"];
    if (!moduleData || !moduleData.selected) return false;
    return true;
}

function hasPermission(user, action) {
    if (!user) return false;
    if (user.type === "company") return true;
    if (user.roles && user.roles.includes("Admin")) return true;

    const modules = user.modules || {};
    const moduleData = modules["Billing"];
    if (!moduleData || !moduleData.selected) return false;

    const permissions = moduleData.permissions || {};
    return permissions[action] === true;
}

async function validateUser(req, requiredAction = null) {
    const token = getTokenFromHeader(req);
    if (!token) return { error: "Authentication required", status: 401 };

    try {
        const user = verifyJWT(token);
        if (!user) return { error: "Invalid token", status: 401 };
        if (!isAuthorized(user)) {
            return { error: "Access denied. You don't have permission to access Billing.", status: 403 };
        }
        if (requiredAction && !hasPermission(user, requiredAction)) {
            return { error: `Permission denied: ${requiredAction} action not allowed for Billing.`, status: 403 };
        }
        return { user, error: null, status: 200 };
    } catch (err) {
        console.error("JWT Verification Failed:", err);
        return { error: "Authentication failed", status: 401 };
    }
}


export async function GET(req) {
    try {
        await connectDb();
        const { user, error, status } = await validateUser(req, "view");
        if (error) return NextResponse.json({ success: false, message: error }, { status });
        const data = await SacCode.find({ companyId: user.companyId, isActive: true }).sort({ code: 1 }).lean();
        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err) {
        console.error("GET /api/billing/sac-codes error:", err);
        return NextResponse.json({ success: false, message: err.message || "Failed to load SAC codes" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectDb();
        const { user, error, status } = await validateUser(req, "create");
        if (error) return NextResponse.json({ success: false, message: error }, { status });
        const body = await req.json();
        const code = String(body.code || "").trim();
        const description = String(body.description || "").trim();
        if (!code) return NextResponse.json({ success: false, message: "SAC code is required" }, { status: 400 });

        const existing = await SacCode.findOne({ companyId: user.companyId, code });
        if (existing) {
            if (existing.isActive) return NextResponse.json({ success: false, message: "This SAC code already exists" }, { status: 409 });
            existing.isActive = true;
            existing.description = description;
            await existing.save();
            return NextResponse.json({ success: true, data: existing }, { status: 200 });
        }
        const created = await SacCode.create({ companyId: user.companyId, code, description, createdBy: user.id });
        return NextResponse.json({ success: true, data: created }, { status: 201 });
    } catch (err) {
        console.error("POST /api/billing/sac-codes error:", err);
        return NextResponse.json({ success: false, message: err.message || "Failed to save SAC code" }, { status: 500 });
    }
}

// Soft delete: bills already generated keep their SAC code text
export async function DELETE(req) {
    try {
        await connectDb();
        const { user, error, status } = await validateUser(req, "create");
        if (error) return NextResponse.json({ success: false, message: error }, { status });
        const id = new URL(req.url).searchParams.get("id");
        if (!id) return NextResponse.json({ success: false, message: "id is required" }, { status: 400 });
        await SacCode.updateOne({ _id: id, companyId: user.companyId }, { $set: { isActive: false } });
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error("DELETE /api/billing/sac-codes error:", err);
        return NextResponse.json({ success: false, message: err.message || "Failed to delete SAC code" }, { status: 500 });
    }
}