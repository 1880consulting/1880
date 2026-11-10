import Link from "next/link";
import { isExternal, type MenuLink } from "@/cms/menus/schema";
import section from "../section.module.css";
import { Logo } from "../ui/Logo";
import styles from "./SiteFooter.module.css";

export function SiteFooter({ links, email }: { links: MenuLink[]; email: string | null }) {
  return (
    <footer className={`${section.section} ${styles.footer}`}>
      <div className={`${section.wrap} ${styles.inner}`}>
        <Link className={styles.logo} href="/" aria-label="1880 Consulting, home">
          <Logo />
        </Link>
        <ul className={styles.links}>
          {links.map((l, i) => (
            <li key={i}>
              {isExternal(l.href) ? (
                <a href={l.href} target="_blank" rel="noopener">
                  {l.label}
                </a>
              ) : (
                <a href={l.href}>{l.label}</a>
              )}
            </li>
          ))}
          {email && (
            <li>
              <span className={styles.mail}>{email}</span>
            </li>
          )}
        </ul>
      </div>
    </footer>
  );
}
