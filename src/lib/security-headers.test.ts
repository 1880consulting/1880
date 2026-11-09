import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

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

  it("relaxes only what hot reload needs in development", () => {
    const csp = contentSecurityPolicy({ https: false, dev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("connect-src 'self' ws: wss:");
  });
});
