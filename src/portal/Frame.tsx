import { PortalHeader } from "./PortalHeader";
import s from "./portal.module.css";

/** A portal page outside any client: plain 1880 header, then the content. */
export function Frame({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  return (
    <>
      <PortalHeader signedIn={signedIn} />
      <main id="main" className={s.main}>
        {children}
      </main>
    </>
  );
}
