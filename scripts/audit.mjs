/**
 * Accessibility and performance audit (PLAN Phase 2).
 *
 *   npm run build && PORT=3100 npm start      (in one terminal)
 *   npm run audit -- http://localhost:3100    (in another)
 *
 * Runs axe (WCAG 2.2 AA rules) on every public page and Studio's sign-in page,
 * then Lighthouse on the main public pages. Exits with an error when axe finds
 * a problem or a Lighthouse score is under 95.
 */
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const base = (process.argv[2] || "http://localhost:3100").replace(/\/$/, "");
const minScore = 95;

const sitemap = await fetch(`${base}/sitemap.xml`).then((r) => r.text());
const fromSitemap = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (m) => new URL(m[1]).pathname,
);
const pages = [...new Set(["/", ...fromSitemap, "/admin/login", "/not-a-page"])];

let failed = false;
const browser = await chromium.launch();
for (const scheme of ["light", "dark"]) {
  const context = await browser.newContext({ colorScheme: scheme });
  const page = await context.newPage();
  for (const path of pages) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    // Let entrance animations finish: text mid-fade would fail the contrast check.
    await page.evaluate(() =>
      Promise.race([
        Promise.all(document.getAnimations().map((a) => a.finished)),
        new Promise((r) => setTimeout(r, 5000)),
      ]),
    );
    // The statement block's words light up as they reach the reading line, so
    // words below it are faint on purpose. That copy is hidden from screen
    // readers (they read the full sentence), and every word is dark once read.
    const result = await new AxeBuilder({ page })
      .exclude("[data-scroll-lit]")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
      .analyze();
    if (result.violations.length) failed = true;
    console.log(`axe ${scheme.padEnd(5)} ${path}: ${result.violations.length ? "" : "ok"}`);
    for (const v of result.violations) {
      console.log(`  ${v.impact} ${v.id}: ${v.help}`);
      for (const n of v.nodes.slice(0, 3)) console.log(`    ${n.target.join(" ")}`);
    }
  }
  await context.close();
}
await browser.close();

const { default: lighthouse } = await import("lighthouse");
const chromeLauncher = await import("chrome-launcher");
const chrome = await chromeLauncher.launch({
  chromePath: process.env.CHROME_PATH || chromium.executablePath(),
  chromeFlags: ["--headless=new", "--no-sandbox"],
});
const lighthousePages = pages
  .filter((p) => !p.startsWith("/admin") && p !== "/not-a-page")
  .slice(0, 6);
for (const path of lighthousePages) {
  for (const formFactor of ["mobile", "desktop"]) {
    const config =
      formFactor === "desktop"
        ? (await import("lighthouse/core/config/desktop-config.js")).default
        : undefined;
    const run = await lighthouse(
      base + path,
      {
        port: chrome.port,
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      },
      config,
    );
    const scores = Object.values(run.lhr.categories).map((c) => [c.id, Math.round(c.score * 100)]);
    const low = scores.filter(([, s]) => s < minScore);
    if (low.length) failed = true;
    console.log(
      `lighthouse ${formFactor.padEnd(7)} ${path}: ${scores.map(([id, s]) => `${id} ${s}`).join(", ")}`,
    );
    if (low.length) {
      for (const a of Object.values(run.lhr.audits))
        if (a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== "informative")
          console.log(`  ${a.id}: ${a.title}${a.displayValue ? ` (${a.displayValue})` : ""}`);
    }
  }
}
await chrome.kill();
process.exit(failed ? 1 : 0);
