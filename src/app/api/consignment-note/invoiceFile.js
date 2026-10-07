import path from "path";
import { readFile } from "fs/promises";

export async function readInvoiceFile(name) {
    const locations = [
        path.join(process.cwd(), "public", "uploads", "lr-invoice", name),
        path.join(process.cwd(), "uploads", "lr-invoice", name),
    ];
    let missing;
    for (const loc of locations) {
        try { return await readFile(loc); }
        catch (e) { if (e?.code !== "ENOENT") throw e; missing = e; }
    }
    throw missing;
}