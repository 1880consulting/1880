"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./os.module.css";

export interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

/** The sidebar's link list. Highlights the current page (exact match for the home link). */
export function SideNav(props: { sections: NavSection[]; homeHref: string; static?: boolean }) {
  return props.static ? <NavLinks {...props} pathname={null} /> : <CurrentNav {...props} />;
}

function CurrentNav(props: { sections: NavSection[]; homeHref: string }) {
  return <NavLinks {...props} pathname={usePathname()} />;
}

function NavLinks({
  sections,
  homeHref,
  pathname,
}: {
  sections: NavSection[];
  homeHref: string;
  pathname: string | null;
}) {
  const isCurrent = (href: string) =>
    pathname !== null &&
    (href === homeHref ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  return (
    <nav aria-label="Studio" className={styles.nav}>
      {sections.map((section, i) => (
        <div key={section.label ?? i} className={styles.navSection}>
          {section.label && <div className={styles.navLabel}>{section.label}</div>}
          {section.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.navLink}
              aria-current={isCurrent(item.href) ? "page" : undefined}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
