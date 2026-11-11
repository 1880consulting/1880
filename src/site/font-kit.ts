/**
 * The Adobe Fonts kit that serves Neue Haas Grotesk (and, if it's in the kit,
 * LTC Bodoni 175) for the public site and the portal (PLAN D48). Off unless
 * ADOBE_FONTS_KIT is set to the kit's id, e.g. "abc1def" from
 * https://use.typekit.net/abc1def.css. The domains must be added to the kit's
 * web project in Adobe Fonts, or the fonts won't load.
 */
export function adobeFontsKit(): string | null {
  const id = process.env.ADOBE_FONTS_KIT?.trim().toLowerCase();
  return id && /^[a-z0-9]{5,12}$/.test(id) ? id : null;
}

/** The kit's stylesheet, or null. */
export function adobeFontsHref(): string | null {
  const id = adobeFontsKit();
  return id ? `https://use.typekit.net/${id}.css` : null;
}

/** Where the kit loads from, for the Content Security Policy. */
export const ADOBE_FONTS_ORIGINS = {
  styles: ["https://use.typekit.net", "https://p.typekit.net"],
  fonts: ["https://use.typekit.net"],
};
