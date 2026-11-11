"use client";

import { useEffect } from "react";

/**
 * Starts GA4 once the page is up (no inline script needed). Page views on
 * in-site navigation are counted by GA4's own "page changes based on browser
 * history" setting, which is on by default.
 */
export function GoogleAnalytics({ id }: { id: string }) {
  useEffect(() => {
    if (window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // GA4 expects the `arguments` object itself, not an array.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", id);
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(s);
  }, [id]);
  return null;
}
