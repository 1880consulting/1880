"use client";

import { useEffect } from "react";

/**
 * Starts GA4 once the page is up (no inline script needed), loading Google's
 * script only after the page has finished loading. Page views on
 * in-site navigation are counted by GA4's own "page changes based on browser
 * history" setting, which is on by default.
 */
export function GoogleAnalytics({ id }: { id: string }) {
  useEffect(() => {
    if (window.gtag) return;
    // Queue calls straight away (track() works from the start), but fetch
    // Google's 160 KB script only once the page has loaded and the browser is
    // idle, so it never competes with the page itself.
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // GA4 expects the `arguments` object itself, not an array.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", id);
    const inject = () => {
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.appendChild(s);
    };
    const whenIdle = () =>
      "requestIdleCallback" in window
        ? window.requestIdleCallback(inject, { timeout: 4000 })
        : setTimeout(inject, 1500);
    if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });
  }, [id]);
  return null;
}
