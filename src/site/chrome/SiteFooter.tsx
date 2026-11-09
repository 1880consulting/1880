import Link from "next/link";
import type { SiteSettings } from "../content";
import section from "../section.module.css";
import { Logo } from "../ui/Logo";
import styles from "./SiteFooter.module.css";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  return (
    <footer className={`${section.section} ${styles.footer}`}>
      <div className={`${section.wrap} ${styles.inner}`}>
        <Link className={styles.logo} href="/" aria-label="1880 Consulting, home">
          <Logo />
        </Link>
        <ul className={styles.links}>
          {settings.social.map((s) => (
            <li key={s.href}>
              <a href={s.href} target="_blank" rel="noopener">
                {s.label}
              </a>
            </li>
          ))}
          <li>
            <span className={styles.mail}>{settings.email}</span>
          </li>
        </ul>
      </div>
    </footer>
  );
}
