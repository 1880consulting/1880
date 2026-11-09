import { Suspense } from "react";
import { SiteFooter } from "@/site/chrome/SiteFooter";
import { SiteNav } from "@/site/chrome/SiteNav";
import { site } from "@/site/content";
import { libreBodoni, libreBodoniExt } from "@/site/fonts";

/** Studio's live preview: the public site's look, inside the editor's frame. */
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-site className={`${libreBodoni.variable} ${libreBodoniExt.variable}`}>
      <Suspense>
        <SiteNav links={site.nav} cta={site.cta} />
      </Suspense>
      <main id="main">{children}</main>
      <SiteFooter settings={site} />
    </div>
  );
}
