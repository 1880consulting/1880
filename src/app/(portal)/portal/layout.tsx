import type { Metadata } from "next";
import { requireSurface } from "@/lib/site-role";
import s from "@/portal/portal.module.css";
import { FontKit } from "@/site/FontKit";
import { libreBodoni, libreBodoniExt } from "@/site/fonts";

export const metadata: Metadata = {
  title: { default: "Client portal", template: "%s · 1880 client portal" },
  robots: { index: false, follow: false },
};

/**
 * Client portal: hub.1880.io. `src/proxy.ts` rewrites every portal request
 * under /portal (after checking access for pages under a client), so this
 * folder is never reached directly on 1880.io.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  requireSurface("portal");
  return (
    <div className={`${s.page} ${libreBodoni.variable} ${libreBodoniExt.variable}`} data-portal>
      <FontKit />
      {children}
    </div>
  );
}
