import { site } from "@/site/content";
import { absolute } from "@/site/seo";
import { FIXED_PAGES, siteEntries } from "@/site/sitemap-data";

/**
 * /llms.txt: a plain-text guide to the site for AI assistants (PLAN §3.2
 * point 8). Lists every live page with its summary.
 */
export async function GET() {
  const entries = await siteEntries();
  const section = (title: string, rows: { path: string; title: string; summary?: string }[]) =>
    rows.length
      ? [
          `## ${title}`,
          "",
          ...rows.map(
            (r) => `- [${r.title}](${absolute(r.path)})${r.summary ? `: ${r.summary}` : ""}`,
          ),
          "",
        ]
      : [];
  const text = [
    `# ${site.name}`,
    "",
    "> 1880 is a storytelling company. We help founders and executive teams at growth-stage government contractors tell their stories and grow.",
    "",
    `Contact: ${site.email}`,
    "",
    ...section(
      "Pages",
      entries.filter((e) => e.type === "page"),
    ),
    ...section(
      "Services",
      entries.filter((e) => e.type === "service"),
    ),
    ...section(
      "Case studies",
      entries.filter((e) => e.type === "work"),
    ),
    ...section("More", FIXED_PAGES),
  ].join("\n");
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
