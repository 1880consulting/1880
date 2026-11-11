import { preconnect } from "react-dom";
import { adobeFontsHref } from "./font-kit";

/**
 * Loads the Adobe Fonts kit, if one is set, without holding up the page: a
 * plain stylesheet link would block drawing until Adobe's stylesheet (and the
 * second one it imports) arrive, about 1.8 s on a phone. Instead a tiny
 * script adds it, the page draws in Helvetica Neue or Arial, and Neue Haas
 * Grotesk swaps in when it's ready (the fallbacks are close in size, so the
 * text barely moves).
 *
 * The script's only variable part is the kit's address, built from an id that
 * must match [a-z0-9] (src/site/font-kit.ts); nobody visiting or editing the
 * site can change it.
 */
export function FontKit() {
  const href = adobeFontsHref();
  if (!href) return null;
  preconnect("https://use.typekit.net", { crossOrigin: "anonymous" });
  preconnect("https://p.typekit.net");
  const load = `(function(){if(document.querySelector('link[data-font-kit]'))return;var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(href)};l.setAttribute('data-font-kit','');document.head.appendChild(l);})();`;
  // No <noscript> copy: React treats a stylesheet link as a resource and
  // fetches it on in-app navigation, which the security policy (rightly)
  // blocks. Without JavaScript, the size-matched fallback font shows.
  return <script dangerouslySetInnerHTML={{ __html: load }} />;
}
