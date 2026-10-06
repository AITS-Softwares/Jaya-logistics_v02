import { NextResponse } from "next/server";
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { withAuth } from "@/lib/auth";

export const runtime = "nodejs";
const TYPES = { "application/pdf": ".pdf", "image/png": ".png", "image/jpeg": ".jpg" };
async function readInvoiceFile(name) {
    const locations = [
        path.join(process.cwd(), "public", "uploads", "lr-invoice", name), // new
        path.join(process.cwd(), "uploads", "lr-invoice", name),           // old invoices
    ];
    let missing;
    for (const loc of locations) {
        try { return await readFile(loc); }
        catch (e) { if (e?.code !== "ENOENT") throw e; missing = e; }
    }
    throw missing;
}

export const POST = withAuth(async (req) => {
    try {
        const file = (await req.formData()).get("file");
        const ext = TYPES[file?.type];
        if (!ext || file.size > 5 * 1024 * 1024)
            return NextResponse.json({ success: false, message: "Only PDF, PNG or JPG up to 5 MB." }, { status: 400 });
        const name = `${randomUUID()}${ext}`;
        const dir = path.join(process.cwd(), "public", "uploads", "lr-invoice");
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
        return NextResponse.json({
            success: true, data: {
                fileName: file.name, filePath: `uploads/lr-invoice/${name}`, mimeType: file.type, fileSize: file.size
            }
        });
    } catch (err) {
        console.error("upload-invoice error:", err);
        return NextResponse.json({ success: false, message: `Server could not store the file: ${err.code || err.message}` }, { status: 500 });
    }
}, { module: "Consignment Note", actions: ["create", "edit"] });

const MIME = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg" };

export const GET = withAuth(async (req) => {
    const name = path.basename(new URL(req.url).searchParams.get("name") || "");
    if (!/^[0-9a-f-]{36}\.(pdf|png|jpg)$/.test(name))
        return NextResponse.json({ success: false, message: "Invalid file." }, { status: 400 });
    try {
        const buf = await readInvoiceFile(name);
        return new NextResponse(buf, {
            headers: { "Content-Type": MIME[path.extname(name)], "Content-Disposition": "inline", "Cache-Control": "private, no-store" }
        });
    } catch {
        return NextResponse.json({ success: false, message: "File not found." }, { status: 404 });
    }
}, { module: "Consignment Note", actions: ["view", "create", "edit"] });