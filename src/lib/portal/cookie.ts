/**
 * The client portal's session cookie. Host-only (no Domain), so it lives on
 * the portal's host alone and never reaches 1880.io (and Studio's cookie never
 * reaches the portal). In production the `__Host-` prefix makes the browser
 * enforce that. Safe to import from proxy.ts.
 */
export const PORTAL_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-portal_session" : "portal_session";

/** How long a client stays signed in. */
export const PORTAL_SESSION_DAYS = 30;
