import { NextResponse, type NextRequest } from "next/server";
import { parsePortalSubdomain, parseSiteRole, routeRequest, surfaceForHost } from "@/lib/routing";

/**
 * Runs before every page. Decides which surface a request belongs to by its
 * hostname (see `src/lib/routing.ts` and PLAN §2.2).
 */
export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const host = request.headers.get("host") ?? url.host;
  const [hostname, port] = host.split(":");
  const role = parseSiteRole(process.env.SITE_ROLE);
  const portalSubdomain = parsePortalSubdomain(process.env.PORTAL_SUBDOMAIN);
  const isPortal = surfaceForHost(hostname, portalSubdomain) === "portal";

  const decision = routeRequest({
    hostname,
    pathname: url.pathname,
    role,
    portalSubdomain,
    // Studio has no sign-in yet, so it only runs under `npm run dev`.
    adminLocked: process.env.NODE_ENV === "production",
  });

  let response: NextResponse;
  switch (decision.kind) {
    case "redirect": {
      // Build from the Host header so an internal server port never leaks
      // into the redirect (www.1880.io → 1880.io, www.localhost:3000 → localhost:3000).
      const target = new URL(url.pathname + url.search, url);
      target.hostname = decision.hostname;
      target.port = port ?? "";
      // Behind the host's HTTPS front end the app itself sees plain http.
      const proto = request.headers.get("x-forwarded-proto");
      if (proto === "https" || proto === "http") target.protocol = `${proto}:`;
      return NextResponse.redirect(target, decision.status);
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
      const target = url.clone();
      target.pathname = decision.pathname;
      response = NextResponse.rewrite(target);
      break;
    }
    case "next":
      response = NextResponse.next();
      break;
  }

  // Portal and admin pages are private: never indexed, never cached by a CDN.
  if (isPortal || url.pathname.startsWith("/admin")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  if (isPortal) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export const config = {
  // Skip Next's own static files and the image optimizer.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
