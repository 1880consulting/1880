import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, STUDIO_PATH_HEADER } from "@/cms/staff/cookie";
import { parsePortalSubdomain, parseSiteRole, routeRequest, surfaceForHost } from "@/lib/routing";
import { PORTAL_COOKIE } from "@/lib/portal/cookie";
import { documentIdIn, portalGate } from "@/lib/portal/gate";
import { frameContext, securityHeaders } from "@/lib/security-headers";
import { analyticsOrigin } from "@/site/analytics";

/**
 * Runs before every page. Decides which surface a request belongs to by its
 * hostname (see `src/lib/routing.ts` and PLAN §2.2).
 */
export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const host = request.headers.get("host") ?? url.host;
  const [hostname, port] = host.split(":");
  const role = parseSiteRole(process.env.SITE_ROLE);
  const portalSubdomain = parsePortalSubdomain(process.env.PORTAL_SUBDOMAIN);
  const isPortal = surfaceForHost(hostname, portalSubdomain) === "portal";
  const proto = request.headers.get("x-forwarded-proto");

  // Security headers on every response, redirects included (src/lib/security-headers.ts).
  // Studio and portal pages are private: never indexed, never stored by a browser or CDN.
  const headers = securityHeaders({
    https: proto === "https" || url.protocol === "https:",
    dev: process.env.NODE_ENV === "development",
    private: isPortal || url.pathname === "/admin" || url.pathname.startsWith("/admin/"),
    noindex: process.env.SITE_INDEXING === "off",
    analyticsOrigin: analyticsOrigin(),
    ...frameContext(url.pathname, isPortal ? "portal" : "public"),
  });
  // An address on the host the visitor asked for. Built from the Host header so
  // an internal server address never leaks into a redirect (and the portal
  // host stays the portal host). Behind Hostinger's HTTPS front end the app
  // itself sees plain http, so the forwarded protocol wins.
  const here = (path: string) => {
    const target = new URL(path, url);
    target.hostname = hostname;
    target.port = port ?? "";
    if (proto === "https" || proto === "http") target.protocol = `${proto}:`;
    return target;
  };
  const finish = (response: NextResponse) => {
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
    return response;
  };

  const decision = routeRequest({
    hostname,
    pathname: url.pathname,
    role,
    portalSubdomain,
    hasStaffCookie: request.cookies.has(SESSION_COOKIE),
  });

  let response: NextResponse;
  switch (decision.kind) {
    case "redirect": {
      // www.1880.io → 1880.io, www.localhost:3000 → localhost:3000.
      const target = here(url.pathname + url.search);
      target.hostname = decision.hostname;
      return finish(NextResponse.redirect(target, decision.status));
    }
    case "moved": {
      // To the main site's address (SITE_URL), whatever host this came in on.
      const site = new URL(process.env.SITE_URL || "https://1880.io");
      const target = new URL(decision.pathname, site);
      return finish(NextResponse.redirect(target, 301));
    }
    case "sign-in": {
      const target = here("/admin/login");
      if (decision.next !== "/admin") target.searchParams.set("next", decision.next + url.search);
      response = NextResponse.redirect(target);
      break;
    }
    case "robots-disallow":
      response = new NextResponse("User-agent: *\nDisallow: /\n", {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
      break;
    case "not-found":
      // A path with no route renders the app's Not found page with a 404.
      response = NextResponse.rewrite(new URL("/_not-found", url));
      break;
    case "rewrite": {
      if (decision.client) {
        // A page under a client: check access before it renders (PLAN §2.3).
        const gate = await portalGate(
          request.cookies.get(PORTAL_COOKIE)?.value,
          decision.client,
          documentIdIn(url.pathname),
        );
        if (gate === "sign-in") {
          const target = here("/");
          target.searchParams.set("next", url.pathname + url.search);
          response = NextResponse.redirect(target);
          break;
        }
        if (gate === "not-found") {
          response = NextResponse.rewrite(new URL("/_not-found", url));
          break;
        }
      }
      const target = url.clone();
      target.pathname = decision.pathname;
      response = NextResponse.rewrite(target);
      break;
    }
    case "next": {
      if (url.pathname.startsWith("/admin")) {
        // Tell the page which address was asked for (see requireStaff). Set
        // here, so a visitor can't supply their own value.
        const headers = new Headers(request.headers);
        headers.set(STUDIO_PATH_HEADER, url.pathname + url.search);
        response = NextResponse.next({ request: { headers } });
      } else {
        response = NextResponse.next();
      }
      break;
    }
  }

  return finish(response);
}

export const config = {
  // Skip Next's own static files and the image optimizer, and Studio's upload
  // endpoints (they check the session themselves, and large uploads shouldn't
  // be buffered by the proxy).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|admin/media/upload$|admin/documents/upload$).*)",
  ],
};
