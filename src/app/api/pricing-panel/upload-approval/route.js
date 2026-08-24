import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { withAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Uploads the Part 1 pricing approval document for Pricing Panel users only. */
export const POST = withAuth(async (request) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const allowedTypes = new Set(["application/pdf", "image/png", "image/jpeg"]);

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ success: false, message: "A file is required." }, { status: 400 });
    }
    if (!allowedTypes.has(file.type) || file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: "Only PDF, PNG, and JPG files up to 5 MB are allowed." }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    // Keep approval documents in the same public uploads tree used by the
    // existing memo/document features. A UUID avoids filename collisions when
    // two users upload the same file at the same time.
    const storedName = `${randomUUID()}-${safeName}`;
    const relativePath = `/uploads/pricing-approval/${storedName}`;
    const directory = path.join(process.cwd(), "public", "uploads", "pricing-approval");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, storedName), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        filePath: relativePath,
        storedName,
        fileSize: file.size,
        mimeType: file.type,
      },
    });
  } catch (error) {
    console.error("POST /api/pricing-panel/upload-approval error:", error);
    return NextResponse.json({ success: false, message: "Unable to upload approval document." }, { status: 500 });
  }
}, { module: "Pricing Panel", actions: ["create", "edit"] });
