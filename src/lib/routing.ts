/**
 * Hostname routing for the three surfaces (PLAN §2.2).
 *
 * Pure function, no Next.js imports, so it is easy to unit test.
 * `src/proxy.ts` turns the decision into a real response.
 *
 * - `1880.io`           → public site (+ CMS at /admin)
 * - `www.1880.io`       → 301 to `1880.io`
 * - `clients.1880.io/*` → client portal. Rewritten internally to `/portal/*`,
 *                         which is where the portal routes live in `src/app`.
 *
 * The portal subdomain isn't decided yet (PLAN D18). It comes from the
 * PORTAL_SUBDOMAIN setting, default `clients`. Any host starting with
 * `<subdomain>.` is the portal, so `clients.localhost:3000` works locally.
 */

export type SiteRole = "public" | "portal" | "all";
export type Surface = "public" | "portal";

/** Internal path prefix the portal routes live under in `src/app`. */
export const PORTAL_PREFIX = "/portal";

/**
 * Names that can never be a client's URL name (PLAN §2.2).
 * `portal` is added because it is the internal route prefix.
 */
export const RESERVED_CLIENT_NAMES: ReadonlySet<string> = new Set([
  "login",
  "logout",
  "auth",
  "api",
  "admin",
  "account",
  "settings",
  "help",
  "support",
  "assets",
  "static",
  "images",
  "files",
  "health",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
  "portal",
]);

/** A valid client URL name: lowercase letters, digits and single hyphens, not reserved. */
export function isValidClientName(name: string): boolean {
  if (name.startsWith("_")) return false;
  if (RESERVED_CLIENT_NAMES.has(name)) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) && name.length <= 63;
}

export function parseSiteRole(value: string | undefined): SiteRole {
  return value === "public" || value === "portal" ? value : "all";
}

export const DEFAULT_PORTAL_SUBDOMAIN = "clients";

/** Reads PORTAL_SUBDOMAIN. Falls back to `clients` if unset or not a valid DNS label. */
export function parsePortalSubdomain(value: string | undefined): string {
  const v = value?.trim().toLowerCase();
  return v && /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(v) && v !== "www"
    ? v
    : DEFAULT_PORTAL_SUBDOMAIN;
}

export function surfaceForHost(
  hostname: string,
  portalSubdomain: string = DEFAULT_PORTAL_SUBDOMAIN,
): Surface {
  return hostname.toLowerCase().startsWith(portalSubdomain + ".") ? "portal" : "public";
}

export function roleServes(role: SiteRole, surface: Surface): boolean {
  return role === "all" || role === surface;
}

export type RouteDecision =
  | { kind: "next" }
  | { kind: "redirect"; hostname: string; status: 301 }
  | { kind: "rewrite"; pathname: string }
  | { kind: "not-found" }
  | { kind: "robots-disallow" };

/** Paths every surface serves as-is (health checks, shared APIs). */
function isSharedPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function routeRequest(input: {
  hostname: string;
  pathname: string;
  role: SiteRole;
  portalSubdomain?: string;
}): RouteDecision {
  const hostname = input.hostname.toLowerCase();
  const { pathname, role } = input;

  // www.1880.io → 1880.io (keeps the path and query).
  if (hostname.startsWith("www.")) {
    return { kind: "redirect", hostname: hostname.slice(4), status: 301 };
  }

  const surface = surfaceForHost(hostname, input.portalSubdomain);
  if (!roleServes(role, surface)) return { kind: "not-found" };

  if (surface === "portal") {
    // The portal is never indexed.
    if (pathname === "/robots.txt") return { kind: "robots-disallow" };
    if (isSharedPath(pathname)) return { kind: "next" };
    // Reject reserved or malformed client names here, before rendering starts:
    // once a page begins streaming, its status code can no longer become 404.
    // (This also 404s /admin, /login and /portal/... on the portal host.)
    const clientName = pathname.split("/")[1];
    if (clientName && !isValidClientName(clientName)) return { kind: "not-found" };
    // clients.1880.io/acme → /portal/acme
    return {
      kind: "rewrite",
      pathname: pathname === "/" ? PORTAL_PREFIX : PORTAL_PREFIX + pathname,
    };
  }

  // Public host: the portal's internal routes don't exist here.
  if (pathname === PORTAL_PREFIX || pathname.startsWith(PORTAL_PREFIX + "/")) {
    return { kind: "not-found" };
  }
  return { kind: "next" };
}
