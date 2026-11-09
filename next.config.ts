import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hostinger forces standalone output (PLAN §4.2).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
