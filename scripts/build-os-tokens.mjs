#!/usr/bin/env node
/**
 * Turns design-system/1880-os/tokens.json (copied from the 1880 OS design
 * system) into design-system/1880-os/tokens.css.
 *
 *   npm run tokens:os
 *
 * Every token becomes a CSS variable prefixed `--os-` and scoped to `[data-os]`,
 * so 1880 OS styles the CMS admin without leaking into the public site.
 * Dark theme: `data-theme="dark"` on the [data-os] element, or the system
 * setting when no theme is chosen.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "design-system", "1880-os");
const tokens = JSON.parse(readFileSync(join(dir, "tokens.json"), "utf8"));

const light = [];
const dark = [];
const resolve = (v) =>
  typeof v === "string" ? v.replace(/^\{(.+)\}$/, (_, name) => `var(--os-${name})`) : String(v);

for (const [family, group] of Object.entries(tokens)) {
  if (family === "type" || !group || !Array.isArray(group.tokens)) continue;
  for (const t of group.tokens) {
    const v = t.value;
    if (v && typeof v === "object") {
      light.push(`  --os-${t.name}: ${resolve(v.light)};`);
      if (v.dark && v.dark !== v.light) dark.push(`  --os-${t.name}: ${resolve(v.dark)};`);
    } else {
      light.push(`  --os-${t.name}: ${resolve(v)};`);
    }
  }
}

const type = tokens.type ?? {};
for (const [name, stack] of Object.entries(type.families ?? {})) {
  // Inter is self-hosted with next/font (src/cms/ui/fonts.ts) as two faces:
  // Latin, then Latin Extended for accented names.
  const value =
    name === "ui"
      ? `var(--os-font-inter, Inter), var(--os-font-inter-ext, Inter), ${stack}`
      : stack;
  light.push(`  --os-font-${name}: ${value};`);
}

const styles = [];
for (const group of type.groups ?? []) {
  for (const s of group.styles ?? []) {
    const rules = [
      `font-family: var(--os-font-${group.family});`,
      `font-size: ${s.fontSize};`,
      `line-height: ${s.lineHeight};`,
      `font-weight: ${s.fontWeight};`,
      s.letterSpacing && `letter-spacing: ${s.letterSpacing};`,
      s.name === "overline" && "text-transform: uppercase;",
    ].filter(Boolean);
    styles.push(`[data-os] .os-type-${s.name} {\n  ${rules.join("\n  ")}\n}`);
  }
}

const css = `/* 1880 OS — generated from tokens.json by scripts/build-os-tokens.mjs. Do not edit by hand. */

[data-os] {
  color-scheme: light;
${light.join("\n")}
}

[data-os][data-theme="dark"] {
  color-scheme: dark;
${dark.join("\n")}
}

@media (prefers-color-scheme: dark) {
  [data-os]:not([data-theme="light"]) {
    color-scheme: dark;
${dark.map((l) => "  " + l).join("\n")}
  }
}

${styles.join("\n\n")}
`;

writeFileSync(join(dir, "tokens.css"), css);
console.log(
  `Wrote ${light.length} tokens (${dark.length} with dark values) and ${styles.length} type styles.`,
);
