/**
 * Server-side Frappe / ERPNext client.
 *
 * This module deliberately has no browser-safe exports: API credentials are
 * read only when a server route creates a client.  Callers should persist a
 * local-to-ERPNext reference before retrying a create operation; the helpers
 * below make that lookup deterministic but cannot replace a unique custom
 * field on the ERPNext DocType.
 */

const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_ERROR_DETAIL_LENGTH = 280;

export class FrappeClientError extends Error {
  constructor(message, { status = null, code = 'FRAPPE_REQUEST_FAILED', retryable = false } = {}) {
    super(message);
    this.name = 'FrappeClientError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

function configuredValue(env, name) {
  const value = env?.[name];
  return typeof value === 'string' ? value.trim() : '';
}

/** Returns true only when all server-side Frappe credentials are present. */
export function isFrappeConfigured(env = process.env) {
  return Boolean(
    configuredValue(env, 'FRAPPE_URL')
      && configuredValue(env, 'FRAPPE_API_KEY')
      && configuredValue(env, 'FRAPPE_API_SECRET')
  );
}

/**
 * Validates the Frappe URL before any credential-bearing HTTP request is made.
 * Only HTTPS endpoints without embedded credentials are allowed.
 */
export function getFrappeBaseUrl(env = process.env) {
  const raw = configuredValue(env, 'FRAPPE_URL');
  if (!raw) {
    throw new FrappeClientError('ERPNext connection is not configured.', { code: 'FRAPPE_NOT_CONFIGURED' });
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new FrappeClientError('ERPNext connection is not configured.', { code: 'FRAPPE_INVALID_CONFIGURATION' });
  }

  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.search || url.hash) {
    throw new FrappeClientError('ERPNext connection is not configured.', { code: 'FRAPPE_INVALID_CONFIGURATION' });
  }

  // Frappe API endpoints are rooted at the site root. Normalize the URL so
  // query parameters and fragments cannot affect credential-bearing requests.
  url.pathname = '/';
  return url;
}

function normalizeTimeout(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_TIMEOUT_MS;
  return Math.max(1_000, Math.min(Math.floor(numeric), 60_000));
}

function validateDocType(value) {
  const normalized = String(value || '').trim();
  if (!normalized) throw new FrappeClientError('ERPNext document type is required.', { code: 'FRAPPE_INVALID_ARGUMENT' });
  return normalized;
}

function validateDocumentName(value) {
  const normalized = String(value || '').trim();
  if (!normalized) throw new FrappeClientError('ERPNext document name is required.', { code: 'FRAPPE_INVALID_ARGUMENT' });
  return normalized;
}

function validateMethod(value) {
  const normalized = String(value || '').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(normalized)) {
    throw new FrappeClientError('Invalid ERPNext method.', { code: 'FRAPPE_INVALID_ARGUMENT' });
  }
  return normalized;
}

function redact(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/(["']?(?:authorization|api[_\s-]?(?:key|secret)|token)["']?\s*[:=]?\s*["']?)(?:(?:token|bearer)\s+)?[^\s,;"'}]+/gi, '$1[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_ERROR_DETAIL_LENGTH);
}

function extractErrorDetail(body) {
  if (!body || typeof body !== 'object') return '';

  let raw = body._server_messages || body.message || body.exc || body.exception || '';
  try { raw = JSON.parse(raw); } catch { /* Frappe may return plain text. */ }

  if (Array.isArray(raw)) {
    raw = raw.map((entry) => {
      try {
        const parsed = typeof entry === 'string' ? JSON.parse(entry) : entry;
        return parsed?.message || parsed?.exc || entry;
      } catch {
        return entry;
      }
    }).join(' ');
  }
  if (raw && typeof raw === 'object') raw = raw.message || raw.exc || '';
  return redact(raw);
}

async function parseResponseBody(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { message: redact(text) }; }
}

function isTransientStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

/**
 * Creates a narrowly-scoped REST client for the configured Frappe site.
 * It never performs a request at construction time.
 */
export function createFrappeClient({ env = process.env, fetchImpl = fetch, timeoutMs } = {}) {
  const baseUrl = getFrappeBaseUrl(env);
  const apiKey = configuredValue(env, 'FRAPPE_API_KEY');
  const apiSecret = configuredValue(env, 'FRAPPE_API_SECRET');
  if (!apiKey || !apiSecret) {
    throw new FrappeClientError('ERPNext connection is not configured.', { code: 'FRAPPE_NOT_CONFIGURED' });
  }
  if (typeof fetchImpl !== 'function') {
    throw new FrappeClientError('ERPNext connection is unavailable.', { code: 'FRAPPE_CLIENT_UNAVAILABLE' });
  }

  const requestTimeoutMs = normalizeTimeout(timeoutMs ?? env?.FRAPPE_TIMEOUT_MS);
  const authorization = `token ${apiKey}:${apiSecret}`;

  function endpoint(pathname, query = {}) {
    const url = new URL(pathname, baseUrl);
    for (const [key, value] of Object.entries(query || {})) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
    return url;
  }

  async function request(pathname, { method = 'GET', query, body, headers } = {}) {
    const url = endpoint(pathname, query);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetchImpl(url, {
        method,
        redirect: 'error',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          Authorization: authorization,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const payload = await parseResponseBody(response);
      if (!response.ok) {
        const detail = extractErrorDetail(payload);
        throw new FrappeClientError(
          `ERPNext request failed (${response.status})${detail ? `: ${detail}` : ''}`,
          { status: response.status, retryable: isTransientStatus(response.status) }
        );
      }
      return payload;
    } catch (error) {
      if (error instanceof FrappeClientError) throw error;
      if (error?.name === 'AbortError') {
        throw new FrappeClientError('ERPNext request timed out.', { code: 'FRAPPE_TIMEOUT', retryable: true });
      }
      // Do not include fetch error text: it can contain a complete request URL.
      throw new FrappeClientError('ERPNext connection failed.', { code: 'FRAPPE_CONNECTION_FAILED', retryable: true });
    } finally {
      clearTimeout(timeout);
    }
  }

  function documentPath(doctype, name) {
    const type = encodeURIComponent(validateDocType(doctype));
    return name === undefined
      ? `/api/resource/${type}`
      : `/api/resource/${type}/${encodeURIComponent(validateDocumentName(name))}`;
  }

  return {
    request,

    /** List a Frappe DocType with explicit filters/fields. */
    async list(doctype, { fields, filters, limitStart, limitPageLength, orderBy, asDict = true } = {}) {
      const result = await request(documentPath(doctype), {
        query: {
          fields,
          filters,
          limit_start: limitStart,
          limit_page_length: limitPageLength,
          order_by: orderBy,
          as_dict: asDict ? 1 : 0,
        },
      });
      return Array.isArray(result?.data) ? result.data : [];
    },

    /** Fetch exactly one document by its ERPNext name. */
    async get(doctype, name) {
      const result = await request(documentPath(doctype, name));
      return result?.data ?? result;
    },

    /** Create an unsaved or draft document through the standard REST API. */
    async create(doctype, document) {
      if (!document || typeof document !== 'object' || Array.isArray(document)) {
        throw new FrappeClientError('ERPNext document data is required.', { code: 'FRAPPE_INVALID_ARGUMENT' });
      }
      const result = await request(documentPath(doctype), { method: 'POST', body: document });
      return result?.data ?? result;
    },

    /** Update an existing document. Callers must not use this for submitted statutory vouchers. */
    async update(doctype, name, patch) {
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        throw new FrappeClientError('ERPNext update data is required.', { code: 'FRAPPE_INVALID_ARGUMENT' });
      }
      const result = await request(documentPath(doctype, name), { method: 'PUT', body: patch });
      return result?.data ?? result;
    },

    /** Invoke Frappe's generic document save method for DocTypes that require it. */
    async save(document) {
      if (!document || typeof document !== 'object' || Array.isArray(document)) {
        throw new FrappeClientError('ERPNext document data is required.', { code: 'FRAPPE_INVALID_ARGUMENT' });
      }
      const result = await request('/api/method/frappe.client.save', { method: 'POST', body: { doc: document } });
      return result?.message ?? result?.data ?? result;
    },

    /** Invoke a trusted Frappe method selected by a server-side caller. */
    async call(method, args = {}) {
      if (!args || typeof args !== 'object' || Array.isArray(args)) {
        throw new FrappeClientError('ERPNext method arguments must be an object.', { code: 'FRAPPE_INVALID_ARGUMENT' });
      }
      const result = await request(`/api/method/${validateMethod(method)}`, { method: 'POST', body: args });
      return result?.message ?? result?.data ?? result;
    },

    /** Submit a draft document only after the owning workflow has approved it. */
    async submit(doctype, name) {
      return this.call('frappe.client.submit', { doc: { doctype: validateDocType(doctype), name: validateDocumentName(name) } });
    },

    /**
     * Looks up a unique external ID custom field before a retryable create.
     * Configure that field as unique in ERPNext; duplicate matches are rejected
     * so a caller cannot accidentally select an arbitrary financial document.
     */
    async findByExternalId(doctype, fieldname, externalId, { fields = ['name', 'docstatus', 'modified'] } = {}) {
      const field = String(fieldname || '').trim();
      const value = String(externalId || '').trim();
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(field) || !value) {
        throw new FrappeClientError('Invalid ERPNext external ID lookup.', { code: 'FRAPPE_INVALID_ARGUMENT' });
      }
      const matches = await this.list(doctype, {
        fields,
        filters: [[field, '=', value]],
        limitPageLength: 2,
      });
      if (matches.length > 1) {
        throw new FrappeClientError('ERPNext has duplicate external IDs; manual review is required.', {
          code: 'FRAPPE_DUPLICATE_EXTERNAL_ID',
        });
      }
      return matches[0] || null;
    },
  };
}
