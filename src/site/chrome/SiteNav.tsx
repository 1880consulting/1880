"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isExternal, type MenuLink } from "@/cms/menus/links";
import { Logo } from "../ui/Logo";
import styles from "./SiteNav.module.css";

/**
 * The floating nav bar, with a full-screen menu on phones. On the home page
 * the in-page links ("/#what-we-do") scroll, and the one for the section in
 * view is underlined.
 */
export function SiteNav({ links, cta }: { links: MenuLink[]; cta: MenuLink | null }) {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const [open, setOpen] = useState(false);
  const [inView, setInView] = useState<string | null>(null);

  // On the home page, "/#x" becomes "#x" so it scrolls without a navigation.
  const href = (h: string) => (onHome && h.startsWith("/#") ? h.slice(1) : h);
  const isCurrent = (h: string) =>
    h.startsWith("/#") ? onHome && inView === h.slice(2) : pathname === h;

  // Underline the link for the section in the middle of the screen.
  useEffect(() => {
    if (!onHome || !("IntersectionObserver" in window)) return;
    const ids = links.filter((l) => l.href.startsWith("/#")).map((l) => l.href.slice(2));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setInView(e.target.id);
          else setInView((cur) => (cur === e.target.id ? null : cur));
        }
      },
      { rootMargin: "-40% 0px -50% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [onHome, links]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const all = cta ? [...links, cta] : links;

  return (
    <>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <nav className={styles.nav} aria-label="Site">
        <div className={styles.bar}>
          <Link
            className={styles.logo}
            href={onHome ? "#top" : "/"}
            aria-label="1880 Consulting, home"
          >
            <Logo />
          </Link>
          <div className={styles.links}>
            {links.map((l, i) => (
              <NavItem
                key={i}
                link={l}
                href={href(l.href)}
                current={isCurrent(l.href) ? (onHome ? "true" : "page") : undefined}
              />
            ))}
          </div>
          {cta && <NavItem link={cta} href={href(cta.href)} className={styles.cta} />}
          <button
            className={styles.burger}
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen(!open)}
          >
            <span />
            <span />
          </button>
        </div>
      </nav>
      <div
        id="site-menu"
        className={`${styles.menu} ${open ? styles.open : ""}`}
        aria-hidden={!open}
        inert={!open}
        onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
      >
        <ul>
          {all.map((l, i) => (
            <li key={i}>
              <NavItem
                link={l}
                href={href(l.href)}
                current={pathname === l.href ? "page" : undefined}
              />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

/** A menu link: links that leave the site open in a new tab. */
function NavItem({
  link,
  href,
  current,
  className,
}: {
  link: MenuLink;
  href: string;
  current?: "page" | "true";
  className?: string;
}) {
  if (isExternal(link.href) || link.href.startsWith("mailto:")) {
    return (
      <a
        className={className}
        href={link.href}
        {...(isExternal(link.href) ? { target: "_blank", rel: "noopener" } : {})}
      >
        {link.label}
      </a>
    );
  }
  return (
    <Link className={className} href={href} aria-current={current}>
      {link.label}
    </Link>
  );
}
