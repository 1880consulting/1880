import { describe, expect, it } from "vitest";
import {
  contentSecurityPolicy,
  frameContext,
  securityHeaders,
  VIDEO_ORIGINS,
} from "./security-headers";

const live = { https: true, dev: false, private: false };

describe("security headers", () => {
  it("sends the standard protections on every page", () => {
    const h = securityHeaders(live);
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(h["Permissions-Policy"]).toContain("camera=()");
    expect(h["Strict-Transport-Security"]).toBe("max-age=63072000; includeSubDomains");
    expect(h["Cache-Control"]).toBeUndefined();
  });

  it("only asks browsers to insist on HTTPS when the site is on HTTPS", () => {
    const h = securityHeaders({ ...live, https: false });
    expect(h["Strict-Transport-Security"]).toBeUndefined();
    expect(h["Content-Security-Policy"]).not.toContain("upgrade-insecure-requests");
  });

  it("keeps private pages out of caches and search engines", () => {
    const h = securityHeaders({ ...live, private: true });
    expect(h["Cache-Control"]).toBe("private, no-store");
    expect(h["X-Robots-Tag"]).toBe("noindex, nofollow");
  });

  it("allows only this site's scripts, styles, fonts and images, and no framing", () => {
    const csp = contentSecurityPolicy(live);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline';");
    expect(csp).not.toMatch(/https?:/); // no outside origins at all
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("lets Studio frame only its own preview, and only Studio frame it", () => {
    expect(securityHeaders(live)["Content-Security-Policy"]).toContain("frame-src 'none'");
    const host = securityHeaders({ ...live, frames: "host" });
    expect(host["Content-Security-Policy"]).toContain("frame-src 'self'");
    expect(host["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    const framed = securityHeaders({ ...live, frames: "framed" });
    expect(framed["Content-Security-Policy"]).toContain("frame-ancestors 'self'");
    expect(framed["X-Frame-Options"]).toBe("SAMEORIGIN");
  });

  it("allows Google Analytics only when it's on", () => {
    expect(contentSecurityPolicy(live)).not.toContain("google");
    const analytics = {
      scripts: ["https://www.googletagmanager.com"],
      connect: ["https://*.google-analytics.com"],
      images: ["https://*.google-analytics.com"],
    };
    const csp = contentSecurityPolicy({ ...live, analytics });
    expect(csp).toContain("script-src 'self' 'unsafe-inline' https://www.googletagmanager.com;");
    expect(csp).toContain("connect-src 'self' https://*.google-analytics.com;");
    expect(csp).toContain("img-src 'self' data: blob: https://*.google-analytics.com;");
  });

  it("relaxes only what hot reload needs in development", () => {
    const csp = contentSecurityPolicy({ https: false, dev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("connect-src 'self' ws: wss:");
  });

  it("frames portal documents only from the portal itself, with interactive pages sandboxed", () => {
    const id = "3f2a8c1e-0000-4000-8000-000000000000";
    const viewer = frameContext(`/acme/d/${id}`, "portal");
    expect(viewer).toEqual({ frames: "host", embeds: VIDEO_ORIGINS });
    const viewerCsp = contentSecurityPolicy({ ...live, ...viewer });
    expect(viewerCsp).toContain(
      "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com",
    );
    expect(viewerCsp).toContain("frame-ancestors 'none'");

    const page = frameContext(`/acme/d/${id}/page`, "portal");
    const pageCsp = contentSecurityPolicy({ ...live, ...page });
    expect(pageCsp).toContain("sandbox allow-scripts");
    expect(pageCsp).not.toContain("allow-same-origin");
    expect(pageCsp).toContain("connect-src 'none'");
    expect(pageCsp).toContain("frame-ancestors 'self'");
    expect(securityHeaders({ ...live, private: true, ...page })["X-Frame-Options"]).toBe(
      "SAMEORIGIN",
    );

    expect(frameContext(`/acme/d/${id}/files/x`, "portal")).toEqual({ frames: "framed" });
    // Same policy on every portal page (in-app navigation keeps the first page's).
    expect(frameContext("/acme", "portal")).toEqual(viewer);
    expect(frameContext("/", "portal")).toEqual(viewer);
    expect(frameContext(`/admin/documents/${id}/page`, "public").content).toBe("interactive");
    // The same address on the public host is just a page: no special rules.
    expect(frameContext(`/acme/d/${id}/page`, "public")).toEqual({ frames: "none" });
  });

  it("keeps a staging copy out of search engines on every page", () => {
    expect(securityHeaders({ ...live, noindex: true })["X-Robots-Tag"]).toBe("noindex, nofollow");
    expect(securityHeaders(live)["X-Robots-Tag"]).toBeUndefined();
  });

  it("allows the Adobe Fonts kit only when one is set", () => {
    expect(contentSecurityPolicy(live)).not.toContain("typekit");
    const csp = contentSecurityPolicy({ ...live, fontKit: true });
    expect(csp).toContain(
      "style-src 'self' 'unsafe-inline' https://use.typekit.net https://p.typekit.net;",
    );
    expect(csp).toContain("font-src 'self' https://use.typekit.net;");
    expect(csp).toContain("connect-src 'self' https://use.typekit.net https://p.typekit.net;");
  });
});
