import type { Metadata } from "next";
import { requireSurface } from "@/lib/site-role";

export const metadata: Metadata = {
  title: "Client portal",
  robots: { index: false, follow: false },
};

/**
 * Client portal: clients.1880.io. `src/proxy.ts` rewrites every portal request
 * under /portal, so this folder is never reached directly on 1880.io.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  requireSurface("portal");
  return children;
}
