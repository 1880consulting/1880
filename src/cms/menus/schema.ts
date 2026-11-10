import { z } from "zod";

/**
 * Menus and footer (PLAN D28). Plain data, safe for the browser: Studio's
 * editor validates with the same rules the server saves with.
 */

const HREF_HELP =
  "Use a page like /contact, a section like /#contact, a full web address starting with https://, or mailto:.";

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

export const menuLinkSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Give the link a label.")
    .max(40, "Keep labels to 40 characters or fewer."),
  href: z.string().trim().min(1, HREF_HELP).max(300).refine(isSafeHref, HREF_HELP),
});

export const menusSchema = z.object({
  /** The links across the top (and in the phone menu). */
  main: z
    .array(menuLinkSchema)
    .max(5, "Keep the menu to 5 links or fewer, so it fits on one line."),
  /** The highlighted button at the end of the menu. */
  button: menuLinkSchema.nullable(),
  /** Links in the footer, e.g. LinkedIn. */
  footer: z.array(menuLinkSchema).max(8, "Keep the footer to 8 links or fewer."),
  /** Show the site's email address in the footer. */
  showEmail: z.boolean(),
});

export type MenuLink = z.infer<typeof menuLinkSchema>;
export type Menus = z.infer<typeof menusSchema>;

/** Opens in a new tab: links that leave the site. */
export const isExternal = (href: string) => /^https?:\/\//i.test(href);
