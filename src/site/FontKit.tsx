import { adobeFontsHref } from "./font-kit";

/** Loads the Adobe Fonts kit, if one is set (React places the stylesheet in the page head). */
export function FontKit() {
  const href = adobeFontsHref();
  return href ? <link rel="stylesheet" href={href} precedence="default" /> : null;
}
