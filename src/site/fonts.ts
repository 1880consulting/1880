import localFont from "next/font/local";

/** Libre Bodoni (OFL), self-hosted from design-system/fonts. PLAN D17. */
export const libreBodoni = localFont({
  src: "../../design-system/fonts/libre-bodoni-latin-wght-normal.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--font-libre-bodoni",
  display: "swap",
  // Let accented characters fall through to the Latin Extended face below.
  adjustFontFallback: false,
});

export const libreBodoniExt = localFont({
  src: "../../design-system/fonts/libre-bodoni-latin-ext-wght-normal.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--font-libre-bodoni-ext",
  display: "swap",
  preload: false,
});
