import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { withAuth } from "@/lib/auth";
import connectDb from "@/lib/db";
import { companyScopeFilter } from "@/lib/companyScope";
import PurchasePanel from "@/app/api/purchase-panel/PurchasePanel";

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

// Mirrors Loading Info attachments: the browser never needs a directly served
// /uploads URL, while the record and operating-company scope remain enforced.
export const GET = withAuth(async (req, context, user) => {
  try {
    const { id } = await context.params;
    const requestedPath = normalizeUploadPath(new URL(req.url).searchParams.get("path"));
    if (!/^[a-f\d]{24}$/i.test(id || "") || !requestedPath) {
      return NextResponse.json({ success: false, message: "Invalid attachment request." }, { status: 400 });
    }

    await connectDb();
    const purchase = await PurchasePanel.findOne(companyScopeFilter(user, { _id: id })).lean();
    if (normalizeUploadPath(purchase?.memoFile?.filePath) !== requestedPath) {
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
    console.error("GET /purchase-panel/[id]/attachment error:", error);
    return NextResponse.json({ success: false, message: "Unable to open attachment." }, { status: 500 });
  }
}, { module: "Purchase Panel", actions: ["create", "edit", "view"] });
