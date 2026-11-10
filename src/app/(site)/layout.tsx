import type { Metadata } from "next";
import { SiteFooter } from "@/site/chrome/SiteFooter";
import { SiteNav } from "@/site/chrome/SiteNav";
import { site } from "@/site/content";
import { getMenus } from "@/site/menus";
import { libreBodoni, libreBodoniExt } from "@/site/fonts";
import { requireSurface } from "@/lib/site-role";

export const metadata: Metadata = {
  metadataBase: new URL("https://1880.io"),
  title: { default: site.name, template: `%s | ${site.name}` },
  openGraph: { siteName: site.name, type: "website", locale: "en_US" },
};

/** Public site: 1880.io */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  requireSurface("public");
  const menus = await getMenus();
  return (
    <div data-site className={`${libreBodoni.variable} ${libreBodoniExt.variable}`}>
      <SiteNav links={menus.main} cta={menus.button} />
      <main id="main">{children}</main>
      <SiteFooter links={menus.footer} email={menus.showEmail ? site.email : null} />
    </div>
  );
}
