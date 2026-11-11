/**
 * Google Analytics 4 (PLAN D45). Off unless GA_MEASUREMENT_ID is set (e.g.
 * "G-FNXWW6CRNM"). Only the public site loads it; Studio and the client
 * portal never do.
 */

const ID_PATTERN = /^G-[A-Z0-9]{4,20}$/;

/** The GA4 measurement id, if analytics is on and the id looks right. */
export function measurementId(): string | null {
  const id = process.env.GA_MEASUREMENT_ID?.trim().toUpperCase();
  return id && ID_PATTERN.test(id) ? id : null;
}

/** Where GA4 loads from and reports to, for the Content Security Policy (null when off). */
export function analyticsSources(): {
  scripts: string[];
  connect: string[];
  images: string[];
} | null {
  if (!measurementId()) return null;
  return {
    scripts: ["https://www.googletagmanager.com"],
    connect: [
      "https://*.google-analytics.com",
      "https://*.analytics.google.com",
      "https://*.googletagmanager.com",
    ],
    images: ["https://*.google-analytics.com", "https://*.googletagmanager.com"],
  };
}

type Params = Record<string, string | number | boolean>;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Records an event, e.g. track("generate_lead"). Does nothing when analytics is off. */
export function track(event: string, params?: Params): void {
  if (typeof window !== "undefined") window.gtag?.("event", event, params ?? {});
}
