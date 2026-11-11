/**
 * Puts today's built-in home page (src/site/content.ts) into the CMS as the
 * published home page, so it can be edited in 1880 Studio. Does nothing if a
 * home page already exists.
 *
 *   npm run cms:seed
 */
import { closeDb } from "@/lib/db";
import { importBuiltInHome } from "@/site/seed-home";

try {
  console.log(
    (await importBuiltInHome())
      ? "Imported the home page and published it."
      : "The CMS already has a home page. Nothing to do.",
  );
} finally {
  await closeDb();
}
