import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { withAuth } from "@/lib/auth";
import connectDb from "@/lib/db";
import { companyScopeFilter } from "@/lib/companyScope";
import POD from "@/app/api/pod-panel/POD";

export const runtime = "nodejs";

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

// Same approach as the Purchase Panel MEMO: the browser never needs a directly
// served /uploads URL, and the POD record + company scope are enforced.
export const GET = withAuth(async (req, context, user) => {
    try {
        const { id } = await context.params;
        const requestedPath = normalizeUploadPath(new URL(req.url).searchParams.get("path"));
        if (!/^[a-f\d]{24}$/i.test(id || "") || !requestedPath) {
            return NextResponse.json({ success: false, message: "Invalid attachment request." }, { status: 400 });
        }

        await connectDb();
        const pod = await POD.findOne(companyScopeFilter(user, { _id: id })).lean();
        const belongsToPod = (pod?.lrEntries || []).some(
            (lr) => normalizeUploadPath(lr?.podFile?.filePath) === requestedPath
        );
        if (!belongsToPod) {
            return NextResponse.json({ success: false, message: "Attachment not found." }, { status: 404 });
        }

        const file = await readStoredUpload(requestedPath);
        const filename = path.basename(requestedPath).replace(/[\r\n"\\]/g, "_");
        return new NextResponse(file, {
            headers: {
                "Content-Type": contentTypeFor(filename),
                "Content-Disposition": `inline; filename="${filename}"`,
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        if (error?.code === "ENOENT") {
            return NextResponse.json({ success: false, message: "Attachment file is no longer available." }, { status: 404 });
        }
        console.error("GET /pod-panel/[id]/attachment error:", error);
        return NextResponse.json({ success: false, message: "Unable to open attachment." }, { status: 500 });
    }
}, { module: "Proof Of Delivery", actions: ["create", "edit", "view", "approve"] });