import "server-only";
import { randomUUID } from "node:crypto";
import { desc, eq, inArray, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { MediaRow } from "@/lib/db/schema";
import { makeShareImage, processImage, type Processed } from "./process";
import { storage } from "./storage";
import type { MediaInfo } from "./types";

/** The media library (PLAN D26). Database and storage work only; callers check permissions. */

const { media, entries, entryVersions: versions } = schema;

export const toInfo = (m: MediaRow): MediaInfo => ({
  id: m.id,
  rev: m.rev,
  filename: m.filename,
  width: m.width,
  height: m.height,
  bytes: m.bytes,
  alt: m.alt,
  focalX: m.focalX,
  focalY: m.focalY,
  widths: m.widths as number[],
});

const prefix = (id: string, rev: number) => `media/${id}/${rev}/`;

async function storeFiles(id: string, rev: number, processed: Processed) {
  for (const f of processed.files)
    await storage().put(prefix(id, rev) + f.name, f.data, f.contentType);
}

/** A display name for a file: no folders, no odd characters, sensible length. */
function cleanFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "image";
  return (
    base
      .replace(/[^\w.\- ()]+/g, "")
      .trim()
      .slice(0, 200) || "image"
  );
}

/**
 * Adds an image to the library. The same file uploaded again returns the
 * existing entry instead of storing a second copy.
 */
export async function addMedia(
  input: Buffer,
  filename: string,
  authorId: string | null,
): Promise<{ media: MediaInfo; existed: boolean }> {
  const processed = await processImage(input);
  const [dupe] = await db().select().from(media).where(eq(media.sha256, processed.sha256)).limit(1);
  if (dupe) return { media: toInfo(dupe), existed: true };

  const id = randomUUID();
  await storeFiles(id, 1, processed);
  await db()
    .insert(media)
    .values({
      id,
      filename: cleanFilename(filename),
      mime: processed.mime,
      width: processed.width,
      height: processed.height,
      bytes: input.length,
      sha256: processed.sha256,
      widths: processed.widths,
      createdBy: authorId,
    });
  return { media: toInfo((await getMediaRow(id))!), existed: false };
}

/**
 * Swaps the file behind an image. Everything that uses it shows the new file;
 * its alt text and focal point stay. The old files are removed.
 */
export async function replaceMedia(
  id: string,
  input: Buffer,
  filename: string,
): Promise<MediaInfo> {
  const current = await getMediaRow(id);
  if (!current) throw new Error("That image no longer exists.");
  const processed = await processImage(input);
  const rev = current.rev + 1;
  await storeFiles(id, rev, processed);
  await db()
    .update(media)
    .set({
      rev,
      filename: cleanFilename(filename),
      mime: processed.mime,
      width: processed.width,
      height: processed.height,
      bytes: input.length,
      sha256: processed.sha256,
      widths: processed.widths,
    })
    .where(eq(media.id, id));
  // Keep the files just replaced for now (a page cached a moment ago may still
  // point at them); remove the version before that.
  if (current.rev > 1) await storage().deletePrefix(prefix(id, current.rev - 1));
  return toInfo((await getMediaRow(id))!);
}

async function getMediaRow(id: string): Promise<MediaRow | undefined> {
  const [m] = await db().select().from(media).where(eq(media.id, id)).limit(1);
  return m;
}

export async function getMedia(id: string): Promise<MediaInfo | null> {
  const m = await getMediaRow(id);
  return m ? toInfo(m) : null;
}

export async function getMediaMany(ids: string[]): Promise<Record<string, MediaInfo>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return {};
  const rows = await db().select().from(media).where(inArray(media.id, unique));
  return Object.fromEntries(rows.map((r) => [r.id, toInfo(r)]));
}

export async function listMedia(limit = 500): Promise<MediaInfo[]> {
  const rows = await db().select().from(media).orderBy(desc(media.createdAt)).limit(limit);
  return rows.map(toInfo);
}

export async function updateMedia(
  id: string,
  input: { alt: string; focalX: number; focalY: number },
): Promise<void> {
  const current = await getMediaRow(id);
  // The share image is cropped around the focal point: make it again next time.
  if (current) await storage().deletePrefix(prefix(id, current.rev) + "og.jpg");
  await db()
    .update(media)
    .set({
      alt: input.alt.trim().slice(0, 300),
      focalX: Math.round(Math.min(1000, Math.max(0, input.focalX))),
      focalY: Math.round(Math.min(1000, Math.max(0, input.focalY))),
    })
    .where(eq(media.id, id));
}

/** Pages whose current draft or live version uses this image. */
export async function mediaUsage(
  id: string,
): Promise<{ id: string; type: string; title: string; live: boolean }[]> {
  const rows = await db()
    .select({ entry: entries, versionId: versions.id, doc: versions.doc })
    .from(versions)
    .innerJoin(
      entries,
      or(eq(entries.draftVersionId, versions.id), eq(entries.publishedVersionId, versions.id)),
    )
    .where(sql`cast(${versions.doc} as char) like ${`%"${id}"%`}`);
  const byEntry = new Map<string, { id: string; type: string; title: string; live: boolean }>();
  for (const r of rows) {
    const prev = byEntry.get(r.entry.id);
    const live = prev?.live || r.versionId === r.entry.publishedVersionId;
    byEntry.set(r.entry.id, {
      id: r.entry.id,
      type: r.entry.type,
      title: (r.doc as { title?: string }).title || "Untitled",
      live,
    });
  }
  return [...byEntry.values()];
}

export class MediaInUseError extends Error {
  constructor(public pages: string[]) {
    super(
      `It's still used on ${pages.join(", ")}. Remove it from ${pages.length > 1 ? "those pages" : "that page"} first.`,
    );
  }
}

/** Deletes an image and its files. Refuses while any page's draft or live version uses it. */
export async function deleteMedia(id: string): Promise<void> {
  const used = await mediaUsage(id);
  if (used.length) throw new MediaInUseError(used.map((u) => u.title));
  const m = await getMediaRow(id);
  if (!m) return;
  await db().delete(media).where(eq(media.id, id));
  await storage().deletePrefix(`media/${id}/`);
}

/** A stored file, for the public /media route. Only sizes, never the original. */
export async function readMediaFile(id: string, rev: number, file: string) {
  if (!/^(\d+\.(avif|webp)|og\.jpg)$/.test(file)) return null;
  const m = await getMediaRow(id);
  if (!m || rev > m.rev || rev < m.rev - 1) return null;
  const found = await storage().get(prefix(id, rev) + file);
  if (found || file !== "og.jpg") return found;
  // The share image is made the first time a site like LinkedIn asks for it.
  const original = await storage().get(prefix(id, rev) + "original");
  if (!original) return null;
  const data = await makeShareImage(original.data, m.focalX, m.focalY);
  await storage().put(prefix(id, rev) + file, data, "image/jpeg");
  return { data, contentType: "image/jpeg" };
}
