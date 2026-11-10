import { connection } from "next/server";
import { z } from "zod";
import { readMediaFile } from "@/cms/media/store";
import { parseSiteRole, roleServes } from "@/lib/routing";

/**
 * Serves image sizes: /media/<id>/<rev>/<width>.<avif|webp>. A replaced image
 * gets a new rev (a new address), so each file can be cached for a year.
 * Originals are never served (they may hold camera data such as GPS).
 */
export async function GET(_req: Request, { params }: RouteContext<"/media/[id]/[rev]/[file]">) {
  await connection();
  if (!roleServes(parseSiteRole(process.env.SITE_ROLE), "public")) return notFound();
  const { id, rev, file } = await params;
  if (!z.uuid().safeParse(id).success || !/^\d{1,6}$/.test(rev)) return notFound();
  const found = await readMediaFile(id, Number(rev), file);
  if (!found) return notFound();
  return new Response(new Uint8Array(found.data), {
    headers: {
      "Content-Type": found.contentType,
      "Content-Length": String(found.data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

const notFound = () =>
  new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
