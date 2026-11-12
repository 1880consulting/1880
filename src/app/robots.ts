import type { MetadataRoute } from "next";
import { absolute } from "@/site/seo";

/** /robots.txt for 1880.io. (The portal answers its own, blocking everything: see proxy.ts.) */
export default function robots(): MetadataRoute.Robots {
  // A staging copy for review: keep every crawler out (PLAN Phase 5).
  if (process.env.SITE_INDEXING === "off") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/preview/"] }],
    sitemap: absolute("/sitemap.xml"),
    host: absolute("/"),
  };
}
