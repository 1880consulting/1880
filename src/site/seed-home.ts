import { randomUUID } from "node:crypto";
import { importPublished, listEntries } from "@/cms/content/store";
import { pageType } from "@/site/cms";
import { home } from "@/site/content";

/**
 * Puts the built-in home page (src/site/content.ts) into the CMS as the
 * published home page, so it can be edited in 1880 Studio. Does nothing if
 * a home page already exists. Used by `npm run cms:seed` and by first-owner
 * setup. Returns whether it imported anything.
 */
export async function importBuiltInHome(): Promise<boolean> {
  const pages = await listEntries("page");
  if (pages.some((p) => p.slug === "")) return false;
  await importPublished(pageType, "", {
    title: "Home",
    seo: { title: home.title, description: home.description },
    blocks: home.blocks.map((b) => ({ id: randomUUID().slice(0, 8), ...b })),
  });
  return true;
}
