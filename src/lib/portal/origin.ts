import "server-only";
import { headers } from "next/headers";
import { parsePortalSubdomain } from "@/lib/routing";

/**
 * The portal's address, for emailed links and for showing a client's URL in
 * Studio. PORTAL_URL wins if set. Otherwise it's SITE_URL with the portal
 * subdomain in front (https://1880.io → https://hub.1880.io). In
 * development it's built from the address in use (localhost:3000 →
 * hub.localhost:3000). Never from the Host header in production: a
 * visitor controls that.
 */
export async function portalOrigin(): Promise<string> {
  if (process.env.PORTAL_URL) return process.env.PORTAL_URL.replace(/\/$/, "");
  const sub = parsePortalSubdomain(process.env.PORTAL_SUBDOMAIN);
  let base = process.env.SITE_URL;
  if (!base) {
    if (process.env.NODE_ENV === "production") base = "https://1880.io";
    else {
      const h = await headers();
      base = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
    }
  }
  const url = new URL(base);
  if (!url.hostname.startsWith(sub + ".")) url.hostname = `${sub}.${url.hostname}`;
  return url.origin;
}
