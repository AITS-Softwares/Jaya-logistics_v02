// Decode only to DENY access. Authentication always verifies signatures in the handler.
// Also rejects still-unexpired tokens from the retired email-based customer login.
export function customerApiBlocked(pathname, authorization) {
  if (!authorization?.startsWith('Bearer ')) return false;
  let claims;
  try {
    const payload = authorization.slice(7).split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    claims = JSON.parse(atob(base64 + '='.repeat((4 - base64.length % 4) % 4)));
  } catch { return false; }
  return claims?.type === 'customer' &&
    !(pathname.startsWith('/api/portal/') || pathname === '/api/auth/me');
}
