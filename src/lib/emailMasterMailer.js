import crypto from "crypto";
import nodemailer from "nodemailer";

function decryptAppPassword(value) {
  if (!value) throw new Error("The active Email Master account has no app password.");

  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    // Email Master historically allowed plaintext values when encryption was
    // not configured. Keep those records usable, but never treat ciphertext as
    // a password when its key is missing.
    if (/^[a-f\d]{32}:[a-f\d]+$/i.test(value)) {
      throw new Error("ENCRYPTION_KEY is required to use the active Email Master account.");
    }
    return value;
  }

  try {
    let iv;
    let encrypted;
    if (value.includes(":")) {
      const [ivHex, encryptedHex] = value.split(":");
      iv = Buffer.from(ivHex, "hex");
      encrypted = Buffer.from(encryptedHex, "hex");
    } else {
      const all = Buffer.from(value, "base64");
      iv = all.subarray(0, 16);
      encrypted = all.subarray(16);
    }
    if (iv.length !== 16 || !encrypted.length) throw new Error("Invalid encrypted password format.");

    const key = crypto.createHash("sha256").update(secret).digest();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    return decipher.update(encrypted, undefined, "utf8") + decipher.final("utf8");
  } catch {
    throw new Error("Could not decrypt the active Email Master password. Check ENCRYPTION_KEY.");
  }
}

function createTransporter(emailMaster) {
  const user = String(emailMaster.email || "").trim();
  const pass = decryptAppPassword(emailMaster.encryptedAppPassword);
  if (!user) throw new Error("The active Email Master account has no sender email.");

  const service = String(emailMaster.service || "gmail").toLowerCase();
  if (service === "gmail") {
    return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  }
  if (["outlook", "office365", "hotmail"].includes(service)) {
    return nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });
  }
  throw new Error(`Email Master service "${emailMaster.service}" is not supported for POD email.`);
}

export function getEmailMasterIssue(emailMaster) {
  if (!emailMaster || emailMaster.status !== "Active") return "No active Email Master account is configured for this company.";
  if (!String(emailMaster.email || "").trim()) return "The active Email Master account has no sender email.";
  const service = String(emailMaster.service || "gmail").toLowerCase();
  if (!(["gmail", "outlook", "office365", "hotmail"].includes(service))) {
    return `Email Master service "${emailMaster.service}" is not supported for POD email.`;
  }
  try {
    decryptAppPassword(emailMaster.encryptedAppPassword);
    return "";
  } catch (error) {
    return error.message;
  }
}

export async function sendMailFromEmailMaster({ emailMaster, to, subject, html }) {
  const issue = getEmailMasterIssue(emailMaster);
  if (issue) throw new Error(issue);

  let recipient = to;
  let finalSubject = subject;
  let finalHtml = html;
  if (process.env.MAIL_REDIRECT_TO) {
    finalSubject = `[TEST - meant for ${recipient}] ${finalSubject}`;
    finalHtml = `<div style="background:#fff3cd;padding:8px;font-family:Arial;font-size:12px">TEST MODE: this email was meant for <b>${recipient}</b></div>${finalHtml}`;
    recipient = process.env.MAIL_REDIRECT_TO;
  }

  const senderName = String(emailMaster.owner || emailMaster.purpose || "").trim();
  const from = senderName
    ? `"${senderName.replace(/["\r\n]/g, "")}" <${emailMaster.email}>`
    : emailMaster.email;
  return createTransporter(emailMaster).sendMail({ from, to: recipient, subject: finalSubject, html: finalHtml });
}
