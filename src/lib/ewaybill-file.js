import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
const dir = () => path.join(process.cwd(), "uploads", "lr-ewaybill");
export async function storeEwaybillPdf(buffer, fileName = "ewaybill.pdf") {
  if (!buffer.length || buffer.length > 5 * 1024 * 1024 || buffer.subarray(0, 5).toString() !== "%PDF-") throw new Error("Upload a valid PDF up to 5 MB.");
  const storageName = `${randomUUID()}.pdf`;
  await mkdir(dir(), { recursive: true });
  await writeFile(path.join(dir(), storageName), buffer);
  return { storageName, fileName: path.basename(fileName), mimeType: "application/pdf", fileSize: buffer.length };
}
export async function readEwaybillPdf(file) {
  if (!/^[a-f0-9-]{36}\.pdf$/.test(file?.storageName || "")) throw new Error("No e-way bill PDF saved.");
  return readFile(path.join(dir(), file.storageName));
}
