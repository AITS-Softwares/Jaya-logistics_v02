import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { withAuth } from "@/lib/auth";
import connectDb from "@/lib/db";
import { companyScopeFilter } from "@/lib/companyScope";
import LoadingPanel from "@/app/api/loading-panel/LoadingPanel";

export const runtime = "nodejs";

function normalizeUploadPath(value) {
  if (typeof value !== "string") return "";
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized.startsWith("uploads/") || normalized.includes("..")) return "";
  return normalized;
}

function collectUploadPaths(value, paths = new Set()) {
  if (typeof value === "string") {
    const normalized = normalizeUploadPath(value);
    if (normalized) paths.add(normalized);
    return paths;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectUploadPaths(item, paths));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectUploadPaths(item, paths));
  }
  return paths;
}

function contentTypeFor(filename) {
  const extension = path.extname(filename).toLowerCase();
  const types = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
  };
  return types[extension] || "application/octet-stream";
}

async function readStoredUpload(relativePath) {
  // Newer uploads are in public/uploads. The second location keeps historical
  // records working because older deployment code wrote to uploads directly.
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

/**
 * Opens a file only when it is actually referenced by this Loading Info
 * record and belongs to the caller's operating-company scope. This replaces
 * fragile direct /uploads URLs, which are not served by every deployment.
 */
export const GET = withAuth(async (req, context, user) => {
  try {
    // Next.js 15 exposes dynamic route params asynchronously.
    const { id: panelId } = await context.params;
    const requestedPath = normalizeUploadPath(new URL(req.url).searchParams.get("path"));
    if (!/^[a-f\d]{24}$/i.test(panelId || "") || !requestedPath) {
      return NextResponse.json({ success: false, message: "Invalid attachment request." }, { status: 400 });
    }

    await connectDb();
    const panel = await LoadingPanel.findOne(companyScopeFilter(user, { _id: panelId })).lean();
    if (!panel || !collectUploadPaths(panel).has(requestedPath)) {
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
    console.error("GET /api/loading-panel/[id]/attachment error:", error);
    return NextResponse.json({ success: false, message: "Unable to open attachment." }, { status: 500 });
  }
}, { module: "Loading Info", actions: ["create", "edit", "view"] });
