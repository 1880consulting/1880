import type { Metadata } from "next";
import { SiteFooter } from "@/site/chrome/SiteFooter";
import { SiteNav } from "@/site/chrome/SiteNav";
import { site } from "@/site/content";
import { libreBodoni, libreBodoniExt } from "@/site/fonts";
import { requireSurface } from "@/lib/site-role";

export const metadata: Metadata = {
  metadataBase: new URL("https://1880.io"),
  title: { default: site.name, template: `%s | ${site.name}` },
  openGraph: { siteName: site.name, type: "website", locale: "en_US" },
};

/** Public site: 1880.io */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  requireSurface("public");
  return (
    <div data-site className={`${libreBodoni.variable} ${libreBodoniExt.variable}`}>
      <SiteNav links={site.nav} cta={site.cta} />
      <main id="main">{children}</main>
      <SiteFooter settings={site} />
    </div>
  );
}
