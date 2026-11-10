import s from "@/portal/portal.module.css";
import { libreBodoni, libreBodoniExt } from "@/site/fonts";

/** Studio's live preview of a portal document: the portal's look, inside the editor's frame. */
export default function DocumentPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${s.page} ${libreBodoni.variable} ${libreBodoniExt.variable}`} data-portal>
      <main id="main" className={s.main}>
        {children}
      </main>
    </div>
  );
}
