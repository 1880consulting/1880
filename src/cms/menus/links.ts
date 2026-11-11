/**
 * Link helpers with no dependencies, safe for the public site's browser code
 * (the menu ships to every page, so it shouldn't pull in zod).
 */

/** A menu or footer link. */
export interface MenuLink {
  label: string;
  href: string;
}

/** Where a link may go: this site, a web address, or an email. Never javascript: or protocol-relative //. */
export function isSafeHref(href: string): boolean {
  if (href.startsWith("/")) return !href.startsWith("//") && !href.startsWith("/\\");
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(href)) return true;
  try {
    const u = new URL(href);
    return (u.protocol === "https:" || u.protocol === "http:") && !!u.hostname.includes(".");
  } catch {
    return false;
  }
}

/** Opens in a new tab: links that leave the site. */
export const isExternal = (href: string) => /^https?:\/\//i.test(href);
