/**
 * The Studio session cookie. Host-only (no Domain), so it never reaches the
 * client portal's subdomain. In production the `__Host-` prefix makes the
 * browser enforce Secure, Path=/ and no Domain. Safe to import from proxy.ts.
 */
export const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-studio_session" : "studio_session";

/** Set by proxy.ts on Studio requests: the page asked for, so sign-in can return there. */
export const STUDIO_PATH_HEADER = "x-studio-path";

/** How long a sign-in lasts. */
export const SESSION_DAYS = 14;
