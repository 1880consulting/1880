import type { MetadataRoute } from "next";
import { absolute } from "@/site/seo";

/** /robots.txt for 1880.io. (The portal answers its own, blocking everything: see proxy.ts.) */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: absolute("/sitemap.xml"),
    host: absolute("/"),
  };
}
