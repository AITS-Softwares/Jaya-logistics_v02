import { NextResponse } from "next/server";
import path from "path";
import { GoogleAuth } from "google-auth-library";
import { withAuth } from "@/lib/auth";
import { readInvoiceFile } from "../invoiceFile";
import { parseEwaybill } from "@/lib/parseEwaybill";

export const runtime = "nodejs";
const MIME = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg" };

async function ocrText(buf, mimeType) {
    const raw = process.env.DOCUMENT_AI_PROCESSOR_URL || process.env.PROCESSOR_ID;
    if (!raw || !/^https:\/\//.test(raw)) return { status: "not_configured" };
    const url = raw.endsWith(":process") ? raw : `${raw.replace(/\/$/, "")}:process`;

    const credentials = process.env.DOCUMENT_AI_CREDENTIALS_JSON
        ? JSON.parse(process.env.DOCUMENT_AI_CREDENTIALS_JSON) : undefined; // else GOOGLE_APPLICATION_CREDENTIALS file
    const client = await new GoogleAuth({
        credentials, scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    }).getClient();
    const { token } = await client.getAccessToken();

    const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ rawDocument: { content: buf.toString("base64"), mimeType } }),
    });
    if (!res.ok) throw new Error(`Document AI HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return { status: "ok", text: data.document?.text || "" };
}

export const POST = withAuth(async (req) => {
    try {
        const { filePath } = await req.json();
        const name = path.basename(String(filePath || ""));
        if (!String(filePath).startsWith("uploads/lr-invoice/") || !/^[0-9a-f-]{36}\.(pdf|png|jpg)$/.test(name)) {
            return NextResponse.json({ success: false, message: "Invalid file." }, { status: 400 });
        }
        const buf = await readInvoiceFile(name);

        let ocr;
        try { ocr = await ocrText(buf, MIME[path.extname(name)]); }
        catch (e) {
            console.error("extract-ewaybill OCR error:", e.message);
            return NextResponse.json({ success: true, ocr: "failed", found: false, ewaybillNo: "", expiryDate: "" });
        }
        if (ocr.status !== "ok") {
            return NextResponse.json({ success: true, ocr: ocr.status, found: false, ewaybillNo: "", expiryDate: "" });
        }
        return NextResponse.json({ success: true, ocr: "ok", ...parseEwaybill(ocr.text) });
    } catch (err) {
        console.error("extract-ewaybill error:", err);
        return NextResponse.json({ success: false, message: "Could not read the invoice." }, { status: 500 });
    }
}, { module: "Consignment Note", actions: ["create", "edit"] });