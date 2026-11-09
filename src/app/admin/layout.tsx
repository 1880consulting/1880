import type { Metadata } from "next";
import { IconExternalLink } from "@tabler/icons-react";
import { AppShell, osStyles } from "@/cms/ui";
import { requireSurface } from "@/lib/site-role";
import logo from "../../../design-system/1880-os/logo/1880-logo-white.svg";
import { NAV } from "./sections";

export const metadata: Metadata = {
  title: { default: "Studio", template: "%s · 1880 Studio" },
  robots: { index: false, follow: false },
};

/** 1880 Studio (the CMS): 1880.io/admin, in the 1880 OS look (PLAN D30). */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  requireSurface("public");
  return (
    <AppShell
      product="1880 Studio"
      logo={{ src: logo.src, alt: "1880" }}
      homeHref="/admin"
      nav={NAV}
      headerActions={
        <a href="/" className={osStyles.button} target="_blank" rel="noreferrer">
          <IconExternalLink size={18} stroke={2} aria-hidden />
          View site
        </a>
      }
    >
      {children}
    </AppShell>
  );
}
