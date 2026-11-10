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
  /** Outside players a page may embed (portal video sections): added to frame-src. */
  embeds?: string[];
  /**
   * "interactive": an uploaded interactive page (PLAN §3.5), served inside the
   * portal's sandboxed frame. It gets its own policy (interactivePagePolicy).
   */
  content?: "app" | "interactive";
}

/**
 * Where an uploaded interactive page may load things from: inline code, fonts
 * from Google Fonts, and libraries from the three big public CDNs. Nothing
 * else, no network requests, and the `sandbox` directive gives it a unique
 * origin, so it can't reach the portal's session or other documents, even if
 * someone opens its address directly. Only this site may frame it.
 */
export const INTERACTIVE_ALLOWED = {
  scripts: ["https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
  styles: ["https://fonts.googleapis.com"],
  fonts: ["https://fonts.gstatic.com"],
};

/** Video players the portal's video section embeds (privacy-enhanced YouTube, Vimeo). */
export const VIDEO_ORIGINS = ["https://www.youtube-nocookie.com", "https://player.vimeo.com"];

/**
 * Framing and content rules by address. Pure, so it's easy to test.
 * `pathname` is the address as the visitor typed it (before the portal rewrite).
 */
export function frameContext(
  pathname: string,
  surface: "public" | "portal",
): Pick<SecurityContext, "frames" | "embeds" | "content"> {
  if (surface === "portal") {
    // /acme/d/<id>/page: an uploaded interactive page, shown in the viewer's frame.
    if (/^\/[^/]+\/d\/[^/]+\/page$/.test(pathname))
      return { frames: "framed", content: "interactive" };
    // /acme/d/<id>/files/<file>: a PDF may show inside the viewer.
    if (/^\/[^/]+\/d\/[^/]+\/files\/[^/]+$/.test(pathname)) return { frames: "framed" };
    // Every other portal page: a document's viewer frames the two above, and
    // video sections embed players. The same rule on every portal page, because
    // moving between pages inside the app keeps the first page's policy.
    return { frames: "host", embeds: VIDEO_ORIGINS };
  }
  if (/^\/admin\/documents\/[^/]+\/page$/.test(pathname))
    return { frames: "framed", content: "interactive" };
  if (/^\/admin\/documents\/[^/]+\/files\/[^/]+$/.test(pathname)) return { frames: "framed" };
  if (pathname.startsWith("/admin/preview/")) return { frames: "framed", embeds: VIDEO_ORIGINS };
  if (pathname.startsWith("/admin/")) return { frames: "host" };
  return { frames: "none" };
}

export function interactivePagePolicy(): string {
  const a = INTERACTIVE_ALLOWED;
  return [
    "default-src 'none'",
    `script-src 'unsafe-inline' ${a.scripts.join(" ")}`,
    `style-src 'unsafe-inline' ${a.styles.join(" ")}`,
    `font-src data: ${a.fonts.join(" ")}`,
    "img-src data: blob:",
    "media-src data: blob:",
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    "frame-ancestors 'self'",
    "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox",
  ].join("; ");
}

export function contentSecurityPolicy(
  ctx: Pick<SecurityContext, "https" | "dev" | "frames" | "analyticsOrigin" | "embeds" | "content">,
): string {
  if (ctx.content === "interactive") return interactivePagePolicy();
  const frameSrc = [...(ctx.frames === "host" ? ["'self'"] : []), ...(ctx.embeds ?? [])];
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
    "frame-src": frameSrc.length ? frameSrc : ["'none'"],
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
