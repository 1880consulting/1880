import { Suspense } from "react";
import { requireSurface } from "@/lib/site-role";
import { SiteFooter } from "@/site/chrome/SiteFooter";
import { SiteNav } from "@/site/chrome/SiteNav";
import { site } from "@/site/content";
import { FontKit } from "@/site/FontKit";
import { libreBodoni, libreBodoniExt } from "@/site/fonts";
import { getMenus } from "@/site/menus";

/**
 * Shared draft previews (PLAN D50): the public site's look, without analytics
 * (a preview link's address is a secret and mustn't reach Google).
 */
export default async function SharedLayout({ children }: { children: React.ReactNode }) {
  requireSurface("public");
  const menus = await getMenus();
  return (
    <div data-site className={`${libreBodoni.variable} ${libreBodoniExt.variable}`}>
      <FontKit />
      <Suspense>
        <SiteNav links={menus.main} cta={menus.button} />
      </Suspense>
      <main id="main">{children}</main>
      <SiteFooter links={menus.footer} email={menus.showEmail ? site.email : null} />
    </div>
  );
}
