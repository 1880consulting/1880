import { Suspense } from "react";
import { SiteFooter } from "@/site/chrome/SiteFooter";
import { SiteNav } from "@/site/chrome/SiteNav";
import { site } from "@/site/content";
import { getMenus } from "@/site/menus";
import { libreBodoni, libreBodoniExt } from "@/site/fonts";

/** Studio's live preview: the public site's look, inside the editor's frame. */
export default async function PreviewLayout({ children }: { children: React.ReactNode }) {
  const menus = await getMenus();
  return (
    <div data-site className={`${libreBodoni.variable} ${libreBodoniExt.variable}`}>
      <Suspense>
        <SiteNav links={menus.main} cta={menus.button} />
      </Suspense>
      <main id="main">{children}</main>
      <SiteFooter links={menus.footer} email={menus.showEmail ? site.email : null} />
    </div>
  );
}
