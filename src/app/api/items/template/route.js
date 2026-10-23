import { NextResponse } from "next/server";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/db";
import Customer from "@/models/CustomerModel";
import ItemGroup from "@/models/ItemGroupModels";
import { validateMasterDataRequest } from "@/lib/masterDataPermission";

const ITEM_TYPES = ["Product", "Service", "Raw Material"];
const UOMS = ["Kilogram (KG)", "Metric Ton (MTP)", "Piece (PC)", "Liter (LTR)", "Meter (MTR)"];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// SheetJS CE does not write Excel validation rules, so add them to the one
// worksheet's OOXML while keeping its option lists in hidden columns on that sheet.
function addDropdownValidations(workbookBuffer, validations) {
  const eocdSignature = 0x06054b50;
  let eocd = -1;
  for (let offset = workbookBuffer.length - 22; offset >= Math.max(0, workbookBuffer.length - 65557); offset--) {
    if (workbookBuffer.readUInt32LE(offset) === eocdSignature) { eocd = offset; break; }
  }
  if (eocd < 0) throw new Error("Could not read generated Excel workbook");

  const entryCount = workbookBuffer.readUInt16LE(eocd + 10);
  const directoryOffset = workbookBuffer.readUInt32LE(eocd + 16);
  const entries = [];
  let cursor = directoryOffset;
  for (let index = 0; index < entryCount; index++) {
    if (workbookBuffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error("Invalid Excel workbook directory");
    const method = workbookBuffer.readUInt16LE(cursor + 10);
    const modTime = workbookBuffer.readUInt16LE(cursor + 12);
    const modDate = workbookBuffer.readUInt16LE(cursor + 14);
    const nameLength = workbookBuffer.readUInt16LE(cursor + 28);
    const extraLength = workbookBuffer.readUInt16LE(cursor + 30);
    const commentLength = workbookBuffer.readUInt16LE(cursor + 32);
    const compressedSize = workbookBuffer.readUInt32LE(cursor + 20);
    const localOffset = workbookBuffer.readUInt32LE(cursor + 42);
    const name = workbookBuffer.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    const localNameLength = workbookBuffer.readUInt16LE(localOffset + 26);
    const localExtraLength = workbookBuffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = workbookBuffer.subarray(dataStart, dataStart + compressedSize);
    const data = method === 8 ? inflateRawSync(compressed) : Buffer.from(compressed);
    entries.push({ name, data, modTime, modDate });
    cursor += 46 + nameLength + extraLength + commentLength;
  }

  const sheetEntry = entries.find((entry) => entry.name === "xl/worksheets/sheet1.xml");
  if (!sheetEntry) throw new Error("Generated workbook is missing its Items worksheet");
  const validationXml = `<dataValidations count="${validations.length}">${validations.map(({ target, formula }) =>
    `<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Invalid value" error="Select a value from the dropdown list." sqref="${target}"><formula1>${formula}</formula1></dataValidation>`
  ).join("")}</dataValidations>`;
  const sheetXml = sheetEntry.data.toString("utf8");
  const insertionPoint = ["<pageMargins", "<ignoredErrors", "</worksheet>"]
    .map((marker) => ({ marker, index: sheetXml.indexOf(marker) }))
    .filter(({ index }) => index >= 0)
    .sort((left, right) => left.index - right.index)[0];
  if (!insertionPoint) throw new Error("Could not find a valid place for Excel dropdown rules");
  sheetEntry.data = Buffer.from(sheetXml.slice(0, insertionPoint.index) + validationXml + sheetXml.slice(insertionPoint.index));

  const localParts = [];
  const centralParts = [];
  let newDirectoryOffset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const compressed = deflateRawSync(entry.data);
    const checksum = crc32(entry.data);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(entry.modTime, 10);
    local.writeUInt16LE(entry.modDate, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    localParts.push(local, compressed);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(entry.modTime, 12);
    central.writeUInt16LE(entry.modDate, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(newDirectoryOffset, 42);
    name.copy(central, 46);
    centralParts.push(central);
    newDirectoryOffset += local.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(eocdSignature, 0);
  end.writeUInt16LE(entryCount, 8);
  end.writeUInt16LE(entryCount, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(newDirectoryOffset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateMasterDataRequest(req, "view");
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const [groups, customers] = await Promise.all([
    ItemGroup.find({ companyId: user.companyId }).sort({ name: 1 }).lean(),
    Customer.find({ companyId: user.companyId }).select("customerName customerCode").sort({ customerName: 1 }).lean(),
  ]);
  const subgroups = [...new Set(groups.flatMap((group) => group.subgroups || []).map((name) => String(name).trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  const options = [
    { column: "I", values: groups.map((group) => group.name), target: "B2:B1000" },
    { column: "J", values: subgroups, target: "C2:C1000" },
    { column: "K", values: customers.map((customer) => `${customer.customerName}${customer.customerCode ? ` (${customer.customerCode})` : ""}`), target: "D2:D1000" },
    { column: "L", values: ITEM_TYPES, target: "F2:F1000" },
    { column: "M", values: UOMS, target: "G2:G1000" },
  ];
  const workbook = XLSX.utils.book_new();
  const rows = [[
    "Item Name",
    "Item Group",
    "Subgroup",
    "Customer",
    "HSN/SAC",
    "Item Type",
    "Unit Of Measure",
    "Description",
    ...options.map(() => ""),
  ]];
  const maxOptions = Math.max(0, ...options.map((option) => option.values.length));
  for (let index = 0; index < maxOptions; index++) {
    rows.push(["", "", "", "", "", "", "", "", ...options.map((option) => option.values[index] || "")]);
  }
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!autofilter"] = { ref: "A1:H1" };
  sheet["!cols"] = Array.from({ length: 13 }, (_, index) => ({ wch: 18, hidden: index >= 8 }));
  XLSX.utils.book_append_sheet(workbook, sheet, "Items");

  const validations = options
    .filter((option) => option.values.length)
    .map((option) => ({ target: option.target, formula: `$${option.column}$2:$${option.column}$${option.values.length + 1}` }));
  const file = addDropdownValidations(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }), validations);
  return new NextResponse(file, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=item_bulk_upload_template.xlsx",
    },
  });
}
