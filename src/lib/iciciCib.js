import crypto from "node:crypto";

const SANDBOX_HOST = "apibankingonesandbox.icicibank.com";
const DEFAULT_TRANSACTION_URL = `https://${SANDBOX_HOST}/api/Corporate/CIB_SV/v1/Transaction`;
const DEFAULT_INQUIRY_URL = `https://${SANDBOX_HOST}/api/Corporate/CIB_SV/v1/TransactionInquiry`;
const DEFAULT_NEFT_STATUS_URL = `https://${SANDBOX_HOST}/api/v1/CIBNEFTStatus_SV`;

function readPem(name) {
  return String(process.env[name] || "").replace(/\\n/g, "\n").trim();
}

function validationError(message) {
  const error = new Error(message);
  error.code = "ICICI_PAYMENT_VALIDATION";
  return error;
}

function getConfig() {
  if (process.env.ICICI_CIB_ENABLED !== "true") {
    throw new Error("ICICI CIB sandbox is not enabled. Configure the server-side ICICI_CIB settings first.");
  }
  const transactionUrl = process.env.ICICI_CIB_TRANSACTION_URL || DEFAULT_TRANSACTION_URL;
  const inquiryUrl = process.env.ICICI_CIB_INQUIRY_URL || DEFAULT_INQUIRY_URL;
  const neftStatusUrl = process.env.ICICI_CIB_NEFT_STATUS_URL || DEFAULT_NEFT_STATUS_URL;
  for (const endpoint of [transactionUrl, inquiryUrl, neftStatusUrl]) {
    const parsed = new URL(endpoint);
    if (parsed.protocol !== "https:" || parsed.hostname !== SANDBOX_HOST) {
      throw new Error("ICICI integration is restricted to the documented sandbox host.");
    }
  }

  const required = [
    "ICICI_CIB_AGGRID", "ICICI_CIB_AGGRNAME", "ICICI_CIB_CORPID", "ICICI_CIB_USERID",
    "ICICI_CIB_URN", "ICICI_CIB_DEBIT_ACCOUNT", "ICICI_CIB_TXNTYPE", "ICICI_CIB_SERVICE_NAME",
  ];
  const missing = required.filter((key) => !process.env[key]);
  const bankCertificate = readPem("ICICI_CIB_BANK_CERTIFICATE_PEM");
  const clientPrivateKey = readPem("ICICI_CIB_CLIENT_PRIVATE_KEY_PEM");
  if (!bankCertificate) missing.push("ICICI_CIB_BANK_CERTIFICATE_PEM");
  if (!clientPrivateKey) missing.push("ICICI_CIB_CLIENT_PRIVATE_KEY_PEM");
  if (missing.length) throw new Error(`ICICI CIB sandbox configuration is incomplete: ${missing.join(", ")}`);

  const txnType = String(process.env.ICICI_CIB_TXNTYPE).toUpperCase();
  if (!["RTG", "RGS", "IFS", "TPA"].includes(txnType)) {
    throw new Error("ICICI_CIB_TXNTYPE must be RTG, RGS, IFS, or TPA as configured by ICICI.");
  }
  const oaepHash = String(process.env.ICICI_CIB_OAEP_HASH || "SHA1").toUpperCase();
  if (!["SHA1", "NONE"].includes(oaepHash)) throw new Error("ICICI_CIB_OAEP_HASH must be SHA1 or NONE.");
  let extraHeaders = {};
  try {
    extraHeaders = JSON.parse(process.env.ICICI_CIB_EXTRA_HEADERS_JSON || "{}");
  } catch {
    throw new Error("ICICI_CIB_EXTRA_HEADERS_JSON must contain a JSON object of bank-approved headers.");
  }
  if (!extraHeaders || Array.isArray(extraHeaders) || typeof extraHeaders !== "object" || Object.values(extraHeaders).some((value) => typeof value !== "string")) {
    throw new Error("ICICI_CIB_EXTRA_HEADERS_JSON must contain string-valued headers.");
  }

  return {
    transactionUrl, inquiryUrl, neftStatusUrl, txnType,
    aggrid: process.env.ICICI_CIB_AGGRID,
    aggrname: process.env.ICICI_CIB_AGGRNAME,
    corpid: process.env.ICICI_CIB_CORPID,
    userid: process.env.ICICI_CIB_USERID,
    urn: process.env.ICICI_CIB_URN,
    debitAccount: process.env.ICICI_CIB_DEBIT_ACCOUNT,
    serviceName: process.env.ICICI_CIB_SERVICE_NAME,
    extraHeaders,
    bankCertificate, clientPrivateKey, oaepHash,
    clientPrivateKeyPassphrase: process.env.ICICI_CIB_CLIENT_PRIVATE_KEY_PASSPHRASE || undefined,
    timeoutMs: Math.max(1000, Number(process.env.ICICI_CIB_TIMEOUT_MS) || 20000),
  };
}

function encryptRequest(payload, config) {
  const sessionKey = crypto.randomBytes(16);
  const iv = crypto.randomBytes(16);
  const aes = crypto.createCipheriv("aes-128-cbc", sessionKey, iv);
  const encryptedData = Buffer.concat([aes.update(JSON.stringify(payload), "utf8"), aes.final()]);
  const encryptedKey = crypto.publicEncrypt({
    key: config.bankCertificate,
    padding: config.oaepHash === "NONE" ? crypto.constants.RSA_PKCS1_PADDING : crypto.constants.RSA_PKCS1_OAEP_PADDING,
    ...(config.oaepHash === "NONE" ? {} : { oaepHash: config.oaepHash.toLowerCase() }),
  }, sessionKey);
  return {
    requestId: crypto.randomUUID(),
    service: config.serviceName,
    encryptedKey: encryptedKey.toString("base64"),
    oaepHashingAlgorithm: config.oaepHash,
    iv: iv.toString("base64"),
    encryptedData: encryptedData.toString("base64"),
    clientInfo: "",
    optionalParam: "",
  };
}

function decryptResponse(packet, config) {
  if (!packet || typeof packet !== "object" || !packet.encryptedKey || !packet.encryptedData) return packet;
  const keyPadding = packet.oaepHashingAlgorithm === "SHA1"
    ? crypto.constants.RSA_PKCS1_OAEP_PADDING
    : crypto.constants.RSA_PKCS1_PADDING;
  const sessionKey = crypto.privateDecrypt({
    key: config.clientPrivateKey,
    ...(config.clientPrivateKeyPassphrase ? { passphrase: config.clientPrivateKeyPassphrase } : {}),
    padding: keyPadding,
    ...(packet.oaepHashingAlgorithm === "SHA1" ? { oaepHash: "sha1" } : {}),
  }, Buffer.from(packet.encryptedKey, "base64"));
  const decoded = Buffer.from(packet.encryptedData, "base64");
  const iv = packet.iv ? Buffer.from(packet.iv, "base64") : decoded.subarray(0, 16);
  const ciphertext = packet.iv ? decoded : decoded.subarray(16);
  const aes = crypto.createDecipheriv("aes-128-cbc", sessionKey, iv);
  const plaintext = Buffer.concat([aes.update(ciphertext), aes.final()]).toString("utf8");
  return JSON.parse(plaintext);
}

async function postEncrypted(url, payload, config) {
  const encryptedBody = JSON.stringify(encryptRequest(payload, config));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  let response;
  try {
    try {
      response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...config.extraHeaders },
      body: encryptedBody,
      signal: controller.signal,
      cache: "no-store",
      });
    } catch (error) {
      error.code = "ICICI_UNCERTAIN";
      throw error;
    }
    const text = await response.text();
    let packet;
    try { packet = text ? JSON.parse(text) : {}; }
    catch {
      const error = new Error(`ICICI returned a non-JSON response (HTTP ${response.status}).`);
      error.code = "ICICI_UNCERTAIN";
      throw error;
    }
    let result;
    try { result = decryptResponse(packet, config); }
    catch (error) { error.code = "ICICI_UNCERTAIN"; throw error; }
    if (!response.ok && !result?.RESPONSE && !result?.Response && !result?.STATUS && !result?.status) {
      const error = new Error(result?.MESSAGE || result?.message || `ICICI request returned HTTP ${response.status} without a conclusive bank status.`);
      error.code = "ICICI_UNCERTAIN";
      throw error;
    }
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

function statusOf(response) {
  return String(response?.STATUS || response?.status || response?.MESSAGE || response?.message || "UNKNOWN").trim().toUpperCase();
}

function bankResult(response) {
  const status = statusOf(response);
  const responseCode = String(response?.RESPONSE || response?.Response || "").toUpperCase();
  const rejected = responseCode === "FAILURE" || status === "FAILURE" || status === "REJECTED";
  const accepted = !rejected && (responseCode === "SUCCESS" || ["SUCCESS", "PENDING", "PENDING FOR APPROVAL", "PENDING FOR PROCESSING"].includes(status));
  return {
    accepted,
    rejected,
    status: rejected ? "FAILURE" : status,
    message: String(response?.MESSAGE || response?.message || "").slice(0, 500),
    requestId: String(response?.REQID || response?.REQ_ID || "").slice(0, 64),
    utr: String(response?.UTRNUMBER || response?.UTR_NUMBER || "").slice(0, 64),
    responseCode: String(response?.RESPONSECODE || response?.ERRORCODE || "").slice(0, 64),
  };
}

export function stableIciciUniqueId(kind, paymentId) {
  const prefix = kind === "advance" ? "JAYAADV" : "JAYABAL";
  const compactId = String(paymentId).replace(/[^a-z0-9]/gi, "").toUpperCase();
  return `${prefix}${compactId}`.slice(0, 40);
}

function transactionPayload(config, payment, uniqueId, kind) {
  const account = kind === "advance"
    ? (payment.paymentDetails?.accountNoCredit || payment.vendorDetails?.accountNo)
    : payment.accountNoCredit;
  const ifsc = kind === "advance"
    ? payment.vendorDetails?.ifsc
    : (payment.bankIfsc || payment.ifscCode);
  const payee = kind === "advance"
    ? (payment.paymentDetails?.vendorNameDebit || payment.vendorDetails?.vendorName)
    : (payment.vendorNameDebit || payment.vendorNamePayment || payment.vendorName);
  const amount = kind === "advance"
    ? Number(payment.paymentDetails?.finalAmount || payment.vendorDetails?.advance)
    : Number(payment.finalAmount);
  if (!account || !/^\d{9,18}$/.test(String(account).trim())) throw validationError("A valid beneficiary account number is required before submitting to ICICI.");
  if (!ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(String(ifsc).trim())) throw validationError("A valid beneficiary IFSC is required before submitting to ICICI.");
  if (!payee || /[^a-z0-9 .&/-]/i.test(String(payee))) throw validationError("A valid beneficiary name without special characters is required.");
  if (!Number.isFinite(amount) || amount <= 0) throw validationError("A payment amount greater than zero is required.");
  if (String(uniqueId).length > 40 || /[^a-z0-9]/i.test(uniqueId)) throw validationError("The bank transaction ID must be at most 40 alphanumeric characters.");
  const remarks = String(kind === "advance" ? payment.paymentDetails?.remarks : payment.remarks || "ERP Payment")
    .replace(/[^a-z0-9 ]/gi, " ").replace(/\s+/g, " ").trim().slice(0, config.txnType === "RGS" ? 32 : 255);
  const txnType = ifsc.toUpperCase().startsWith("ICIC") ? "TPA" : config.txnType;
  return {
    AGGRID: config.aggrid,
    AGGRNAME: config.aggrname,
    CORPID: config.corpid,
    USERID: config.userid,
    URN: config.urn,
    UNIQUEID: uniqueId,
    DEBITACC: config.debitAccount,
    CREDITACC: String(account).trim(),
    IFSC: txnType === "TPA" ? "ICIC0000011" : String(ifsc).trim().toUpperCase(),
    AMOUNT: amount.toFixed(2),
    CURRENCY: "INR",
    TXNTYPE: txnType,
    PAYEENAME: String(payee).trim().slice(0, 80),
    REMARKS: remarks || "ERP Payment",
    WORKFLOW_REQD: "Y",
  };
}

export async function submitCibPayment({ kind, payment, uniqueId }) {
  const config = getConfig();
  const payload = transactionPayload(config, payment, uniqueId, kind);
  let response;
  try {
    response = await postEncrypted(config.transactionUrl, payload, config);
  } catch (error) {
    error.transactionType = payload.TXNTYPE;
    throw error;
  }
  return { ...bankResult(response), transactionType: payload.TXNTYPE, raw: response };
}

export async function inquireCibPayment({ uniqueId }) {
  const config = getConfig();
  const response = await postEncrypted(config.inquiryUrl, {
    AGGRID: config.aggrid,
    CORPID: config.corpid,
    USERID: config.userid,
    UNIQUEID: uniqueId,
    URN: config.urn,
  }, config);
  return { ...bankResult(response), transactionType: config.txnType, raw: response };
}

export async function inquireCibNeftPayment({ utrNumber }) {
  const config = getConfig();
  const response = await postEncrypted(config.neftStatusUrl, {
    AGGRID: config.aggrid,
    CORPID: config.corpid,
    USERID: config.userid,
    UTRNUMBER: utrNumber,
    URN: config.urn,
  }, config);
  const rawStatus = `${response?.STATUS || response?.status || ""} ${response?.MESSAGE || response?.message || response?.REASON || response?.Reason || ""}`.toUpperCase();
  let status = "PENDING";
  if (rawStatus.includes("AMOUNT CREDITED TO BENEFICIARY")) status = "SUCCESS";
  else if (rawStatus.includes("AMOUNT REFUNDED") || rawStatus === "FAILURE" || rawStatus.includes("REJECTED") || rawStatus.includes("REVERSED")) status = "REVERSED";
  else if (rawStatus.includes("INVALID TRANSACTION ID") || rawStatus.trim() === "UNKNOWN") status = "UNKNOWN";
  return {
    accepted: true,
    rejected: status === "REVERSED",
    status,
    message: String(response?.MESSAGE || response?.message || response?.REASON || response?.Reason || rawStatus).slice(0, 500),
    requestId: String(response?.REQID || response?.REQ_ID || "").slice(0, 64),
    utr: String(response?.UTRNUMBER || response?.UTR_NUMBER || utrNumber).slice(0, 64),
    responseCode: String(response?.RESPONSECODE || response?.ERRORCODE || "").slice(0, 64),
    raw: response,
  };
}

export function normalizeCibStatus(status) {
  const value = String(status || "UNKNOWN").toUpperCase();
  if (value.includes("PENDING FOR APPROVAL")) return "PENDING FOR APPROVAL";
  if (value.includes("PENDING FOR PROCESSING")) return "PENDING FOR PROCESSING";
  if (value === "SUCCESS" || value === "COMPLETED") return "SUCCESS";
  if (value === "REJECTED" || value === "FAILURE") return "FAILURE";
  if (value === "REVERSED") return "REVERSED";
  if (value === "PENDING") return "PENDING";
  return "UNKNOWN";
}
