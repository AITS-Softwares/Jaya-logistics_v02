import ErpNextSyncLog, { sanitizeAuditText } from "@/models/ErpNextSyncLog";

// This module deliberately has no HTTP dependency. A caller records a local
// attempt before calling ERPNext and records the outcome afterwards. Keeping
// those operations separate prevents an external request from being hidden
// inside a MongoDB transaction.

const SENSITIVE_KEY = /(?:api[_-]?(?:key|secret)|authorization|token|password|secret|cookie|session|payload|body|stack|trace)/i;
const SAFE_METADATA_KEYS = new Set([
  "action",
  "doctype",
  "document",
  "documentname",
  "documentno",
  "erpnextdoctype",
  "erpnextname",
  "httpstatus",
  "localdoctype",
  "localrecordid",
  "message",
  "reason",
  "status",
]);

/**
 * Converts a small, non-sensitive metadata object into a safe log summary.
 * Unknown and secret-like keys are omitted rather than stored. This is for
 * identifiers and statuses only; do not pass request or response payloads.
 */
export function sanitizeSyncMetadata(metadata = {}, maxLength = 500) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";

  const safe = Object.entries(metadata).reduce((result, [key, value]) => {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey || SENSITIVE_KEY.test(normalizedKey)) return result;
    if (!SAFE_METADATA_KEYS.has(normalizedKey.toLowerCase())) return result;
    if (value === undefined || value === null || typeof value === "object") return result;
    result[normalizedKey] = String(value).slice(0, 160);
    return result;
  }, {});

  return sanitizeAuditText(JSON.stringify(safe), maxLength);
}

/**
 * Produces a short error suitable for an administrator-visible audit log.
 * It never persists a raw error object, stack trace, HTTP body, or credential.
 */
export function sanitizeSyncError(error, maxLength = 500) {
  const message = error instanceof Error ? error.message : error;
  return sanitizeAuditText(message, maxLength) || "ERPNext synchronization failed";
}

function requiredText(value, label, maxLength = 200) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${label} is required`);
  return text.slice(0, maxLength);
}

function optionalText(value, maxLength = 200) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeBase(input) {
  if (!input || typeof input !== "object") throw new Error("Sync log input is required");

  return {
    companyId: requiredText(input.companyId, "companyId", 128),
    subCompanyId: input.subCompanyId ? optionalText(input.subCompanyId, 128) : null,
    subCompanyCode: optionalText(input.subCompanyCode, 40),
    subCompanyName: optionalText(input.subCompanyName, 160),
    localDoctype: requiredText(input.localDoctype, "localDoctype", 120),
    localRecordId: requiredText(input.localRecordId, "localRecordId", 128),
    erpNextDoctype: optionalText(input.erpNextDoctype, 120),
    action: requiredText(input.action, "action", 80).toLowerCase(),
    idempotencyKey: requiredText(input.idempotencyKey, "idempotencyKey", 200),
    createdBy: input.createdBy || null,
  };
}

function filterFor(input) {
  return {
    companyId: requiredText(input.companyId, "companyId", 128),
    idempotencyKey: requiredText(input.idempotencyKey, "idempotencyKey", 200),
  };
}

function attempt(status, { httpStatus = null, summary = "" } = {}) {
  const numericStatus = Number(httpStatus);
  return {
    attemptedAt: new Date(),
    status,
    httpStatus: Number.isInteger(numericStatus) && numericStatus >= 100 && numericStatus <= 599 ? numericStatus : null,
    summary: sanitizeAuditText(summary, 500),
  };
}

function auditSummary(value) {
  return typeof value === "string"
    ? sanitizeAuditText(value, 500)
    : sanitizeSyncMetadata(value || {});
}

async function updateExistingAfterDuplicate(filter, update) {
  return ErpNextSyncLog.findOneAndUpdate(filter, update, { new: true, runValidators: true });
}

/**
 * Creates or resumes a durable local sync attempt. The caller must invoke this
 * after its local business transaction commits and before making an ERPNext
 * request. Reusing the same idempotency key increments the attempt counter
 * without making a duplicate ERPNext document by itself.
 */
export async function startSyncAttempt(input) {
  const base = normalizeBase(input);
  const filter = { companyId: base.companyId, idempotencyKey: base.idempotencyKey };
  const now = new Date();
  const startSummary = auditSummary(input.metadata ?? input.summary);
  const update = {
    // `status` belongs only in $set below. MongoDB rejects an upsert which
    // targets the same path in both $setOnInsert and $set.
    $setOnInsert: base,
    $set: {
      status: "processing",
      lastAttemptAt: now,
      nextAttemptAt: null,
      ...(base.erpNextDoctype ? { erpNextDoctype: base.erpNextDoctype } : {}),
    },
    $inc: { attemptCount: 1 },
    $push: { attempts: attempt("processing", { summary: startSummary }) },
  };

  try {
    return await ErpNextSyncLog.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    });
  } catch (error) {
    // A simultaneous retry can race the unique idempotency index. In that
    // case, update the existing row rather than failing or creating a second.
    if (error?.code === 11000) return updateExistingAfterDuplicate(filter, update);
    throw error;
  }
}

/**
 * Marks an existing attempt successful after ERPNext confirms the document.
 */
export async function completeSyncAttempt(input) {
  const filter = filterFor(input);
  const now = new Date();
  const summary = auditSummary(input.metadata ?? input.summary);
  const result = await ErpNextSyncLog.findOneAndUpdate(filter, {
    $set: {
      status: "synced",
      ...(input.erpNextDoctype ? { erpNextDoctype: optionalText(input.erpNextDoctype, 120) } : {}),
      ...(input.erpNextName ? { erpNextName: optionalText(input.erpNextName, 160) } : {}),
      responseSummary: summary,
      lastError: "",
      completedAt: now,
      nextAttemptAt: null,
    },
    $push: { attempts: attempt("synced", { httpStatus: input.httpStatus, summary }) },
  }, { new: true, runValidators: true });

  if (!result) throw new Error("ERPNext sync log was not found for completion");
  return result;
}

/**
 * Records a failed ERPNext call. Validation failures should set
 * `requiresReview: true`; callers may provide a future retry time only for
 * transient failures that are safe to retry.
 */
export async function failSyncAttempt(input) {
  const filter = filterFor(input);
  const status = input.requiresReview ? "requires_review" : "failed";
  const error = sanitizeSyncError(input.error || input.message);
  const retryAt = input.requiresReview || !input.nextAttemptAt ? null : new Date(input.nextAttemptAt);
  const result = await ErpNextSyncLog.findOneAndUpdate(filter, {
    $set: {
      status,
      lastError: error,
      nextAttemptAt: retryAt instanceof Date && !Number.isNaN(retryAt.valueOf()) ? retryAt : null,
    },
    $push: { attempts: attempt(status, { httpStatus: input.httpStatus, summary: error }) },
  }, { new: true, runValidators: true });

  if (!result) throw new Error("ERPNext sync log was not found for failure recording");
  return result;
}

/**
 * Stores the latest read-only ERPNext reconciliation result without changing
 * the underlying accounting document or restarting a submission attempt.
 */
export async function recordSyncReconciliation(input) {
  const filter = filterFor(input);
  const summary = auditSummary(input.metadata ?? input.summary);
  const result = await ErpNextSyncLog.findOneAndUpdate(filter, {
    $set: {
      ...(input.erpNextDoctype ? { erpNextDoctype: optionalText(input.erpNextDoctype, 120) } : {}),
      ...(input.erpNextName ? { erpNextName: optionalText(input.erpNextName, 160) } : {}),
      ...(summary ? { responseSummary: summary } : {}),
      reconciledAt: new Date(),
    },
  }, { new: true, runValidators: true });

  if (!result) throw new Error("ERPNext sync log was not found for reconciliation");
  return result;
}
/**
 * Fetches one scoped audit record for a UI/API status view. It is intentionally
 * not a queue processor and never makes an ERPNext HTTP request.
 */
export async function getSyncAttempt(input) {
  return ErpNextSyncLog.findOne(filterFor(input)).lean();
}
