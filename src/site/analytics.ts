/**
 * Plausible analytics (PLAN §2.4): cookieless, so no consent banner. Off
 * unless PLAUSIBLE_DOMAIN is set (e.g. "1880.io"). PLAUSIBLE_SRC points at a
 * self-hosted or proxied script; the default is Plausible's own.
 */
export function analyticsConfig(): { domain: string; src: string } | null {
  const domain = process.env.PLAUSIBLE_DOMAIN?.trim();
  if (!domain) return null;
  return { domain, src: process.env.PLAUSIBLE_SRC?.trim() || "https://plausible.io/js/script.js" };
}

/** The script's origin, for the Content Security Policy (null when analytics is off or self-hosted). */
export function analyticsOrigin(): string | null {
  const cfg = analyticsConfig();
  if (!cfg) return null;
  try {
    const u = new URL(cfg.src);
    return u.protocol === "https:" ? u.origin : null;
  } catch {
    return null; // a path on this site, e.g. /js/script.js
  }
}

type Props = Record<string, string | number | boolean>;
declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Props }) => void;
  }
}

/** Records an event, e.g. track("Contact form sent"). Does nothing when analytics is off. */
export function track(event: string, props?: Props): void {
  if (typeof window !== "undefined") window.plausible?.(event, props ? { props } : undefined);
}
