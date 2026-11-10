import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hostinger forces standalone output (PLAN §4.2).
  output: "standalone",
  // Don't advertise the framework in an X-Powered-By header.
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
