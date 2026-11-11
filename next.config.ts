import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hostinger forces standalone output (PLAN §4.2).
  output: "standalone",
  // Don't advertise the framework in an X-Powered-By header.
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  // Public pages are cached on the server and refreshed the moment something is
  // published (updateTag). This profile sets what other caches may do: a CDN
  // (Hostinger's) may keep a page for 60 seconds, so a published change shows
  // everywhere within about a minute. Redefines the built-in "default"
  // profile, which every "use cache" without its own cacheLife() uses.
  cacheLife: {
    default: {
      stale: 300, // browser's in-app navigation cache: 5 minutes
      revalidate: 60, // CDN and server freshness: 1 minute (s-maxage)
      expire: 86400, // after a day without visits, wait for a fresh page
    },
  },
};

export default nextConfig;
