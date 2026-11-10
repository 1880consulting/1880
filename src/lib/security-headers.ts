/**
 * Security headers for every page and API response (PLAN §3.2 point 10).
 * Applied in src/proxy.ts. Pure function, so it's easy to test.
 *
 * About the Content Security Policy: the public site is prerendered (static)
 * for speed, and Next.js puts small inline scripts in every page to start the
 * app. Static pages can't carry a per-request nonce, so scripts are limited
 * to this site plus inline ('unsafe-inline'), and nothing from anywhere else.
 * Everything else is locked to this site. React escapes everything it
 * renders, and the site never injects raw HTML, which is what an attacker
 * would need to abuse inline scripts.
 */

export interface SecurityContext {
  /** Served over HTTPS (production behind Hostinger's front end). */
  https: boolean;
  /** `next dev`: hot reload needs eval and a websocket. */
  dev: boolean;
  /** Private pages (Studio, portal): never stored by browsers or caches. */
  private: boolean;
  /**
   * Studio's live preview: the editor shows the page in a frame. "host" may
   * frame this site's own pages; "framed" is the preview page itself, which
   * only this site may frame. Everything else can neither frame nor be framed.
   */
  frames?: "none" | "host" | "framed";
  /** Analytics script origin (Plausible), allowed only when analytics is on. */
  analyticsOrigin?: string | null;
}

export function contentSecurityPolicy(
  ctx: Pick<SecurityContext, "https" | "dev" | "frames" | "analyticsOrigin">,
): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(ctx.dev ? ["'unsafe-eval'"] : []),
      ...(ctx.analyticsOrigin ? [ctx.analyticsOrigin] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": [
      "'self'",
      ...(ctx.dev ? ["ws:", "wss:"] : []),
      ...(ctx.analyticsOrigin ? [ctx.analyticsOrigin] : []),
    ],
    "media-src": ["'self'"],
    "object-src": ["'none'"],
    "frame-src": [ctx.frames === "host" ? "'self'" : "'none'"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": [ctx.frames === "framed" ? "'self'" : "'none'"],
  };
  const policy = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (ctx.https) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

export function securityHeaders(ctx: SecurityContext): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Security-Policy": contentSecurityPolicy(ctx),
    // Don't guess file types: a "text file" can't be run as a script.
    "X-Content-Type-Options": "nosniff",
    // Other sites can't put 1880.io in a frame (stops click-jacking). Older-browser twin of frame-ancestors.
    "X-Frame-Options": ctx.frames === "framed" ? "SAMEORIGIN" : "DENY",
    // Links to other sites get only "1880.io", never the full address.
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // The site uses none of these, so nothing embedded can ask for them.
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), browsing-topics=()",
    // Pages opened from 1880.io (or that open it) can't reach into its window.
    "Cross-Origin-Opener-Policy": "same-origin",
  };
  if (ctx.https) {
    // Browsers remember to use HTTPS for 1880.io and its subdomains for 2 years.
    headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains";
  }
  if (ctx.private) {
    headers["Cache-Control"] = "private, no-store";
    headers["X-Robots-Tag"] = "noindex, nofollow";
  }
  return headers;
}
