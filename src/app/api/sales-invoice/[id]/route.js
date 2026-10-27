import mongoose from "mongoose";
import formidable from "formidable";
import { Readable } from "stream";
import dbConnect from "@/lib/db";
import SalesInvoice from "@/models/SalesInvoice";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { activeOperatingCompanyId, companyScopeFilter } from "@/lib/companyScope";
import { identifierFormatError } from "@/lib/identifierFormats";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getScopedUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { response: json({ success: false, message: "Unauthorized" }, 401) };

  try {
    const user = verifyJWT(token);
    if (!user?.companyId) return { response: json({ success: false, message: "Invalid token" }, 401) };
    if (!user.activeOperatingCompanyId || !user.activeOperatingCompanyCode) {
      return { response: json({ success: false, message: "Select an operating company before working with Sales Invoices." }, 400) };
    }
    activeOperatingCompanyId(user);
    return { user };
  } catch {
    return { response: json({ success: false, message: "Unauthorized" }, 401) };
  }
}

function stripServerOwnedFields(data) {
  for (const key of Object.keys(data || {})) {
    if (
      ["_id", "__v", "companyId", "subCompanyId", "subCompanyName", "subCompanyCode", "createdBy", "invoiceNumber", "erpNext"].includes(key)
      || key.startsWith("erpNext.")
    ) {
      delete data[key];
    }
  }
}

class InvoiceRequestError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

async function toNodeReq(request) {
  const body = Buffer.from(await request.arrayBuffer());
  const nodeReq = new Readable({
    read() {
      this.push(body);
      this.push(null);
    },
  });
  nodeReq.headers = Object.fromEntries(request.headers.entries());
  return nodeReq;
}

async function parseMultipart(request) {
  const nodeReq = await toNodeReq(request);
  const form = formidable({ multiples: true, keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(nodeReq, (error, fields, files) => {
      if (error) reject(error);
      else resolve({ fields, files });
    });
  });
}

function firstField(value) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeAttachment(value) {
  if (!value || typeof value !== "object") return null;
  const fileUrl = String(value.fileUrl || "").trim();
  if (!fileUrl) return null;
  return {
    fileName: String(value.fileName || "Attachment").trim(),
    fileUrl,
    fileType: String(value.fileType || "").trim(),
    publicId: String(value.publicId || "").trim(),
    uploadedAt: value.uploadedAt || new Date(),
  };
}

function removeAttachment(currentAttachments, removedFiles) {
  const removedKeys = new Set(
    (Array.isArray(removedFiles) ? removedFiles : [])
      .flatMap((file) => [file?.publicId, file?.fileUrl])
      .filter(Boolean)
      .map(String)
  );
  if (!removedKeys.size) return currentAttachments;
  return currentAttachments.filter((file) =>
    !removedKeys.has(String(file.publicId || "")) && !removedKeys.has(String(file.fileUrl || ""))
  );
}

async function uploadNewAttachments(files) {
  const newFiles = ["newFiles", "newAttachments"]
    .flatMap((name) => {
      const value = files[name];
      return Array.isArray(value) ? value : value ? [value] : [];
    });

  return Promise.all(newFiles.map(async (file) => {
    const uploaded = await cloudinary.uploader.upload(file.filepath, {
      folder: "invoices",
      resource_type: "auto",
    });
    return {
      fileName: file.originalFilename || "Attachment",
      fileUrl: uploaded.secure_url,
      fileType: file.mimetype || "",
      publicId: uploaded.public_id,
      uploadedAt: new Date(),
    };
  }));
}

async function requestId(context) {
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return null;
  return id;
}

// GET /api/sales-invoice/[id]
export async function GET(req, context) {
  try {
    await dbConnect();
    const auth = getScopedUser(req);
    if (auth.response) return auth.response;
    const id = await requestId(context);
    if (!id) return json({ success: false, message: "Invalid Sales Invoice ID" }, 400);

    const invoice = await SalesInvoice.findOne(companyScopeFilter(auth.user, { _id: id }));
    if (!invoice) return json({ success: false, message: "Sales Invoice not found" }, 404);

    return json({ success: true, data: invoice });
  } catch (error) {
    console.error("Error fetching SalesInvoice:", error);
    return json({ success: false, message: "Error fetching SalesInvoice" }, 500);
  }
}

// PUT /api/sales-invoice/[id]
export async function PUT(req, context) {
  try {
    await dbConnect();
    const auth = getScopedUser(req);
    if (auth.response) return auth.response;
    const id = await requestId(context);
    if (!id) return json({ success: false, message: "Invalid Sales Invoice ID" }, 400);

    const isMultipart = (req.headers.get("content-type") || "").includes("multipart/form-data");
    let data;
    let newFiles = [];
    if (isMultipart) {
      const { fields, files } = await parseMultipart(req);
      const rawInvoiceData = firstField(fields.invoiceData);
      try {
        data = JSON.parse(rawInvoiceData || "{}");
      } catch {
        throw new InvoiceRequestError("Sales Invoice data is invalid.");
      }
      newFiles = await uploadNewAttachments(files);
    } else {
      data = await req.json();
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new InvoiceRequestError("Sales Invoice data is invalid.");
    }
    const formatError = identifierFormatError(data);
    if (formatError) return json({ success: false, message: formatError }, 400);

    // Identity, legal issuer, generated numbering, and ERPNext sync state are
    // controlled by the server. They cannot be reassigned during an edit.
    stripServerOwnedFields(data);

    // Browser edits send existing attachment metadata plus only the files
    // selected in this request. Read the stored document first so an ordinary
    // edit cannot accidentally erase attachments that were not in the form.
    const existingInvoice = await SalesInvoice.findOne(companyScopeFilter(auth.user, { _id: id }));
    if (!existingInvoice) return json({ success: false, message: "Sales Invoice not found" }, 404);
    const requestedAttachments = Array.isArray(data.attachments)
      ? data.attachments.map(normalizeAttachment).filter(Boolean)
      : existingInvoice.attachments || [];
    data.attachments = [...removeAttachment(requestedAttachments, data.removedFiles), ...newFiles];
    delete data.removedFiles;

    const updatedSalesInvoice = await SalesInvoice.findOneAndUpdate(
      companyScopeFilter(auth.user, { _id: id }),
      data,
      { new: true, runValidators: true }
    );
    if (!updatedSalesInvoice) return json({ success: false, message: "Sales Invoice not found" }, 404);

    return json({ success: true, message: "Sales Invoice updated successfully", data: updatedSalesInvoice });
  } catch (error) {
    console.error("Error updating SalesInvoice:", error);
    if (error instanceof InvoiceRequestError) {
      return json({ success: false, message: error.message }, error.status);
    }
    return json({ success: false, message: "Error updating SalesInvoice" }, 500);
  }
}

// DELETE /api/sales-invoice/[id]
export async function DELETE(req, context) {
  try {
    await dbConnect();
    const auth = getScopedUser(req);
    if (auth.response) return auth.response;
    const id = await requestId(context);
    if (!id) return json({ success: false, message: "Invalid Sales Invoice ID" }, 400);

    const deletedSalesInvoice = await SalesInvoice.findOneAndDelete(companyScopeFilter(auth.user, { _id: id }));
    if (!deletedSalesInvoice) return json({ success: false, message: "Sales Invoice not found" }, 404);

    return json({ success: true, message: "Sales Invoice deleted successfully" });
  } catch (error) {
    console.error("Error deleting SalesInvoice:", error);
    return json({ success: false, message: "Error deleting SalesInvoice" }, 500);
  }
}
