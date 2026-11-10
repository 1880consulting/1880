/**
 * Puts today's built-in home page (src/site/content.ts) into the CMS as the
 * published home page, so it can be edited in 1880 Studio. Does nothing if a
 * home page already exists.
 *
 *   npm run cms:seed
 */
import { randomUUID } from "node:crypto";
import { listEntries, importPublished } from "@/cms/content/store";
import { home } from "@/site/content";
import { pageType } from "@/site/cms";
import { closeDb } from "@/lib/db";

try {
  const pages = await listEntries("page");
  if (pages.some((p) => p.slug === "")) {
    console.log("The CMS already has a home page. Nothing to do.");
  } else {
    const doc = {
      title: "Home",
      seo: { title: home.title, description: home.description },
      blocks: home.blocks.map((b) => ({ id: randomUUID().slice(0, 8), ...b })),
    };
    await importPublished(pageType, "", doc);
    console.log(`Imported the home page (${doc.blocks.length} sections) and published it.`);
  }
} finally {
  await closeDb();
}
