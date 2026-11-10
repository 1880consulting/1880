import localFont from "next/font/local";

/** Inter, self-hosted from design-system/1880-os/fonts (OFL, license beside the files). */
export const interLatin = localFont({
  src: "../../../design-system/1880-os/fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--os-font-inter",
  display: "swap",
  // No metric-matched fallback here, so characters outside Latin fall through
  // to the Latin Extended face below rather than to a system font.
  adjustFontFallback: false,
});

export const interLatinExt = localFont({
  src: "../../../design-system/1880-os/fonts/inter-latin-ext-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--os-font-inter-ext",
  display: "swap",
  preload: false,
});
