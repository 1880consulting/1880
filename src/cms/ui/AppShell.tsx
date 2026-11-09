import type { ReactNode } from "react";
import { interLatin, interLatinExt } from "./fonts";
import styles from "./os.module.css";
import { SideNav, type NavSection } from "./SideNav";
import "../../../design-system/1880-os/tokens.css";

export interface AppShellProps {
  /** The line under the logo, e.g. "1880 Studio". */
  product: string;
  /** White logo for the charcoal sidebar. */
  logo: { src: string; alt: string };
  homeHref: string;
  nav: NavSection[];
  /** Right side of the header. */
  headerActions?: ReactNode;
  children: ReactNode;
}

/**
 * The admin frame in the 1880 OS style: charcoal sidebar with the mark,
 * a sticky header, and the page on the gray canvas. Light and dark follow
 * the system setting until a theme switch is added.
 */
export function AppShell({ product, logo, homeHref, nav, headerActions, children }: AppShellProps) {
  return (
    <div data-os className={`${interLatin.variable} ${interLatinExt.variable} ${styles.root}`}>
      <aside className={styles.sidebar}>
        <a href={homeHref} className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG */}
          <img src={logo.src} alt={logo.alt} width={96} height={38} />
          <span className={styles.product}>{product}</span>
        </a>
        <SideNav sections={nav} homeHref={homeHref} />
      </aside>
      <div className={styles.main}>
        <header className={styles.header}>{headerActions}</header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
