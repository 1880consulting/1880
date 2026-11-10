import { describe, expect, it } from "vitest";
import {
  isValidClientName,
  parsePortalSubdomain,
  parseSiteRole,
  routeRequest,
  type SiteRole,
} from "./routing";

const route = (hostname: string, pathname: string, role: SiteRole = "all") =>
  routeRequest({ hostname, pathname, role });

describe("routeRequest", () => {
  it("serves public pages on 1880.io", () => {
    expect(route("1880.io", "/about")).toEqual({ kind: "next" });
    expect(route("1880.io", "/admin")).toEqual({ kind: "sign-in", next: "/admin" });
    expect(route("localhost", "/")).toEqual({ kind: "next" });
  });

  it("redirects www to the bare domain", () => {
    expect(route("www.1880.io", "/about")).toEqual({
      kind: "redirect",
      hostname: "1880.io",
      status: 301,
    });
  });

  it("rewrites portal requests under /portal", () => {
    expect(route("clients.1880.io", "/")).toEqual({ kind: "rewrite", pathname: "/portal" });
    expect(route("clients.1880.io", "/acme/d/x1")).toEqual({
      kind: "rewrite",
      pathname: "/portal/acme/d/x1",
      client: "acme",
    });
    expect(route("clients.localhost", "/acme")).toEqual({
      kind: "rewrite",
      pathname: "/portal/acme",
      client: "acme",
    });
  });

  it("serves the portal's own pages and library images outside any client", () => {
    expect(route("clients.1880.io", "/auth")).toEqual({
      kind: "rewrite",
      pathname: "/portal/auth",
    });
    expect(route("clients.1880.io", "/account")).toEqual({
      kind: "rewrite",
      pathname: "/portal/account",
    });
    expect(route("clients.1880.io", "/media/abc/1/320.webp")).toEqual({ kind: "next" });
    // Only those exact pages: anything under them is Not found.
    expect(route("clients.1880.io", "/account/x")).toEqual({ kind: "not-found" });
  });

  it("hides the portal's internal routes on the public host", () => {
    expect(route("1880.io", "/portal")).toEqual({ kind: "not-found" });
    expect(route("1880.io", "/portal/acme")).toEqual({ kind: "not-found" });
    expect(route("1880.io", "/portals-are-fine")).toEqual({ kind: "next" });
  });

  it("can't reach public or admin pages through the portal host", () => {
    expect(route("clients.1880.io", "/admin")).toEqual({ kind: "not-found" });
    expect(route("clients.1880.io", "/about")).toEqual({
      kind: "rewrite",
      pathname: "/portal/about",
      client: "about",
    });
  });

  it("404s reserved and malformed client names before rendering", () => {
    for (const path of ["/login", "/portal/acme", "/_secret", "/Acme", "/acme--co/d/1"]) {
      expect(route("clients.1880.io", path)).toEqual({ kind: "not-found" });
    }
  });

  it("passes shared API routes through on both hosts", () => {
    expect(route("clients.1880.io", "/api/health")).toEqual({ kind: "next" });
    expect(route("1880.io", "/api/health")).toEqual({ kind: "next" });
  });

  it("blocks crawlers on the portal", () => {
    expect(route("clients.1880.io", "/robots.txt")).toEqual({ kind: "robots-disallow" });
  });

  it("404s whichever surface SITE_ROLE excludes", () => {
    expect(route("1880.io", "/about", "portal")).toEqual({ kind: "not-found" });
    expect(route("clients.1880.io", "/acme", "public")).toEqual({ kind: "not-found" });
    expect(route("1880.io", "/about", "public")).toEqual({ kind: "next" });
  });
});

describe("Studio sign-in gate", () => {
  const r = (pathname: string, hasStaffCookie = false) =>
    routeRequest({ hostname: "1880.io", pathname, role: "all", hasStaffCookie });

  it("sends people without a session to sign in, remembering where they were going", () => {
    expect(r("/admin")).toEqual({ kind: "sign-in", next: "/admin" });
    expect(r("/admin/inquiries")).toEqual({ kind: "sign-in", next: "/admin/inquiries" });
  });

  it("lets everyone reach the sign-in pages", () => {
    for (const p of ["/admin/login", "/admin/link", "/admin/set-password", "/admin/forgot"]) {
      expect(r(p)).toEqual({ kind: "next" });
    }
  });

  it("passes signed-in requests on (the page checks the session for real)", () => {
    expect(r("/admin/inquiries", true)).toEqual({ kind: "next" });
  });

  it("leaves the public site alone", () => {
    expect(r("/contact")).toEqual({ kind: "next" });
    expect(r("/administrator-guide")).toEqual({ kind: "next" });
  });
});

describe("portal subdomain setting", () => {
  it("routes whichever subdomain is configured to the portal", () => {
    const r = (hostname: string) =>
      routeRequest({ hostname, pathname: "/acme", role: "all", portalSubdomain: "portal" });
    expect(r("portal.1880.io")).toEqual({
      kind: "rewrite",
      pathname: "/portal/acme",
      client: "acme",
    });
    expect(r("clients.1880.io")).toEqual({ kind: "next" });
  });

  it("falls back to clients for missing or invalid values", () => {
    expect(parsePortalSubdomain(undefined)).toBe("clients");
    expect(parsePortalSubdomain("")).toBe("clients");
    expect(parsePortalSubdomain("www")).toBe("clients");
    expect(parsePortalSubdomain("bad.value")).toBe("clients");
    expect(parsePortalSubdomain(" Hub ")).toBe("hub");
  });
});

describe("isValidClientName", () => {
  it("accepts readable names", () => {
    expect(isValidClientName("acme")).toBe(true);
    expect(isValidClientName("acme-co-2")).toBe(true);
  });

  it("rejects reserved, underscored and malformed names", () => {
    for (const name of ["login", "api", "portal", "_next", "Acme", "acme--co", "-acme", ""]) {
      expect(isValidClientName(name)).toBe(false);
    }
  });
});

describe("parseSiteRole", () => {
  it("defaults to all", () => {
    expect(parseSiteRole(undefined)).toBe("all");
    expect(parseSiteRole("nonsense")).toBe("all");
    expect(parseSiteRole("portal")).toBe("portal");
  });
});

describe("1880consulting.com redirects", () => {
  const route = (hostname: string, pathname: string) =>
    routeRequest({ hostname, pathname, role: "all" });
  it("sends the old site's pages to their new addresses", () => {
    expect(route("1880consulting.com", "/")).toEqual({ kind: "moved", pathname: "/" });
    expect(route("www.1880consulting.com", "/contact/")).toEqual({
      kind: "moved",
      pathname: "/contact",
    });
    expect(route("1880consulting.com", "/Contact")).toEqual({
      kind: "moved",
      pathname: "/contact",
    });
  });
  it("sends WordPress leftovers to the home page", () => {
    for (const p of [
      "/sample-page/",
      "/uncategorized/hello-world/",
      "/author/jmediagroup/",
      "/feed/",
      "/wp-login.php",
    ])
      expect(route("1880consulting.com", p)).toEqual({ kind: "moved", pathname: "/" });
  });
  it("leaves 1880.io alone", () => {
    expect(route("1880.io", "/contact")).toEqual({ kind: "next" });
  });
});
