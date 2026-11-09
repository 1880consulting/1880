import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { EntryRow, EntryVersionRow } from "@/lib/db/schema";
import {
  checkSlug,
  docSchema,
  emptyDoc,
  validateForPublish,
  type ContentType,
  type EntryDoc,
  type Issue,
} from "./types";

/**
 * Entries and their versions (PLAN §3.2). Every save adds an immutable
 * version; an entry points at its current draft and its published version.
 * Database work only: permissions, cache updates and audit live in the
 * server actions that call this.
 */

const { entries, entryVersions: versions, redirects } = schema;

export class ConflictError extends Error {
  constructor() {
    super("Someone else saved this page while you were editing. Reload to see their changes.");
  }
}
export class SlugTakenError extends Error {
  constructor() {
    super("Another page already uses that address. Choose another one.");
  }
}
export class InvalidError extends Error {
  constructor(public issues: Issue[]) {
    super(issues[0]?.message ?? "Some fields need attention.");
  }
}

export interface EntrySummary {
  id: string;
  type: string;
  slug: string;
  title: string;
  status: EntryRow["status"];
  /** The draft differs from what's live. */
  hasChanges: boolean;
  updatedAt: Date;
  publishedAt: Date | null;
}

export interface EntryWithDocs {
  entry: EntryRow;
  draft: EntryDoc;
  published: EntryDoc | null;
}

const parseDoc = (doc: unknown): EntryDoc => docSchema.parse(doc);

async function getVersion(id: string | null): Promise<EntryVersionRow | undefined> {
  if (!id) return undefined;
  const [v] = await db().select().from(versions).where(eq(versions.id, id)).limit(1);
  return v;
}

// ---- Reading ----

export async function listEntries(type: string): Promise<EntrySummary[]> {
  const rows = await db()
    .select()
    .from(entries)
    .where(and(eq(entries.type, type), ne(entries.status, "archived")));
  const draftIds = rows.map((r) => r.draftVersionId).filter((id): id is string => !!id);
  const docs = draftIds.length
    ? await db()
        .select({ id: versions.id, doc: versions.doc })
        .from(versions)
        .where(inArray(versions.id, draftIds))
    : [];
  const titles = new Map(docs.map((d) => [d.id, (d.doc as EntryDoc).title]));
  return rows
    .map((r) => ({
      id: r.id,
      type: r.type,
      slug: r.slug,
      title: titles.get(r.draftVersionId ?? "") || "Untitled",
      status: r.status,
      hasChanges:
        r.status === "published" &&
        (r.draftVersionId !== r.publishedVersionId || r.slug !== r.publishedSlug),
      updatedAt: r.updatedAt,
      publishedAt: r.publishedAt,
    }))
    .sort((a, b) => (a.slug === "" ? -1 : b.slug === "" ? 1 : a.title.localeCompare(b.title)));
}

export async function getEntry(id: string): Promise<EntryWithDocs | null> {
  const [entry] = await db().select().from(entries).where(eq(entries.id, id)).limit(1);
  if (!entry || entry.status === "archived") return null;
  const draft = await getVersion(entry.draftVersionId);
  const published =
    entry.publishedVersionId === entry.draftVersionId
      ? draft
      : await getVersion(entry.publishedVersionId);
  return {
    entry,
    draft: draft ? parseDoc(draft.doc) : emptyDoc(""),
    published: published && entry.publishedVersionId ? parseDoc(published.doc) : null,
  };
}

/** What's live at an address, for the public site. */
export async function getPublishedBySlug(type: string, slug: string): Promise<EntryDoc | null> {
  const [row] = await db()
    .select({ doc: versions.doc })
    .from(entries)
    .innerJoin(versions, eq(versions.id, entries.publishedVersionId))
    .where(
      and(eq(entries.type, type), eq(entries.publishedSlug, slug), eq(entries.status, "published")),
    )
    .limit(1);
  return row ? parseDoc(row.doc) : null;
}

export async function listPublishedSlugs(type: string): Promise<string[]> {
  const rows = await db()
    .select({ slug: entries.publishedSlug })
    .from(entries)
    .where(and(eq(entries.type, type), eq(entries.status, "published")));
  return rows.map((r) => r.slug ?? "");
}

export async function listVersions(entryId: string, limit = 100) {
  return db()
    .select({
      id: versions.id,
      authorId: versions.authorId,
      note: versions.note,
      createdAt: versions.createdAt,
    })
    .from(versions)
    .where(eq(versions.entryId, entryId))
    .orderBy(desc(versions.createdAt))
    .limit(limit);
}

export async function findRedirect(path: string): Promise<{ toPath: string; code: number } | null> {
  const [r] = await db().select().from(redirects).where(eq(redirects.fromPath, path)).limit(1);
  return r ? { toPath: r.toPath, code: r.code } : null;
}

// ---- Writing ----

export async function createEntry(
  type: ContentType,
  input: { title: string; slug: string },
  authorId: string | null,
): Promise<string> {
  const slugError = checkSlug(type, input.slug);
  if (slugError) throw new InvalidError([{ path: ["slug"], message: slugError }]);
  const id = randomUUID();
  const versionId = randomUUID();
  try {
    await db().transaction(async (tx) => {
      await tx
        .insert(entries)
        .values({ id, type: type.id, slug: input.slug, status: "draft", updatedBy: authorId });
      await tx.insert(versions).values({
        id: versionId,
        entryId: id,
        doc: emptyDoc(input.title.trim()),
        authorId,
        note: "Created",
      });
      await tx.update(entries).set({ draftVersionId: versionId }).where(eq(entries.id, id));
    });
  } catch (err) {
    if (isDuplicate(err)) throw new SlugTakenError();
    throw err;
  }
  return id;
}

/**
 * Saves a new draft version. `baseVersionId` is the draft the editor started
 * from: if someone saved in between, this refuses rather than overwrite them.
 */
export async function saveDraft(
  type: ContentType,
  id: string,
  input: { doc: EntryDoc; slug: string; baseVersionId: string | null; note?: string },
  authorId: string | null,
): Promise<string> {
  const doc = docSchema.parse(input.doc);
  const slugError = checkSlug(type, input.slug, { allowHome: true });
  if (slugError) throw new InvalidError([{ path: ["slug"], message: slugError }]);
  const versionId = randomUUID();
  try {
    await db().transaction(async (tx) => {
      const [entry] = await tx.select().from(entries).where(eq(entries.id, id)).for("update");
      if (!entry || entry.status === "archived")
        throw new InvalidError([{ path: [], message: "This page no longer exists." }]);
      if (entry.draftVersionId !== input.baseVersionId) throw new ConflictError();
      // The home page keeps its address; other pages can't take the home address.
      if ((entry.slug === "") !== (input.slug === "")) {
        throw new InvalidError([
          {
            path: ["slug"],
            message:
              entry.slug === ""
                ? "The home page's address can't change."
                : "Choose an address for this page.",
          },
        ]);
      }
      await tx
        .insert(versions)
        .values({ id: versionId, entryId: id, doc, authorId, note: input.note ?? "Saved" });
      await tx
        .update(entries)
        .set({ draftVersionId: versionId, slug: input.slug, updatedBy: authorId })
        .where(eq(entries.id, id));
    });
  } catch (err) {
    if (isDuplicate(err)) throw new SlugTakenError();
    throw err;
  }
  return versionId;
}

/**
 * Makes the current draft live. If the address changed since the last
 * publish, the old address redirects to the new one. Returns the addresses
 * whose content changed, so the caller can refresh their caches.
 */
export async function publish(
  type: ContentType,
  id: string,
  authorId: string | null,
): Promise<{ slugs: string[] }> {
  return db().transaction(async (tx) => {
    const [entry] = await tx.select().from(entries).where(eq(entries.id, id)).for("update");
    if (!entry || entry.status === "archived" || !entry.draftVersionId) {
      throw new InvalidError([{ path: [], message: "This page no longer exists." }]);
    }
    const [draft] = await tx.select().from(versions).where(eq(versions.id, entry.draftVersionId));
    const issues = validateForPublish(type, parseDoc(draft.doc), entry.slug);
    if (issues.length) throw new InvalidError(issues);

    const oldSlug = entry.publishedSlug;
    if (oldSlug !== null && oldSlug !== entry.slug) {
      const from = type.path(oldSlug);
      const to = type.path(entry.slug);
      // The new address is a real page again, so nothing may redirect away from it…
      await tx.delete(redirects).where(eq(redirects.fromPath, to));
      // …earlier redirects to the old address now go straight to the new one…
      await tx.update(redirects).set({ toPath: to }).where(eq(redirects.toPath, from));
      // …and the old address points here.
      await tx
        .insert(redirects)
        .values({ fromPath: from, toPath: to, code: 308 })
        .onDuplicateKeyUpdate({ set: { toPath: to } });
    }
    await tx
      .update(entries)
      .set({
        publishedVersionId: entry.draftVersionId,
        publishedSlug: entry.slug,
        status: "published",
        publishedAt: new Date(),
        updatedBy: authorId,
      })
      .where(eq(entries.id, id));
    return { slugs: [...new Set([entry.slug, ...(oldSlug !== null ? [oldSlug] : [])])] };
  });
}

/** Takes a page off the site. Its draft stays. */
export async function unpublish(id: string, authorId: string | null): Promise<{ slugs: string[] }> {
  const [entry] = await db().select().from(entries).where(eq(entries.id, id)).limit(1);
  if (!entry) return { slugs: [] };
  await db()
    .update(entries)
    .set({ status: "draft", publishedVersionId: null, publishedSlug: null, updatedBy: authorId })
    .where(eq(entries.id, id));
  return { slugs: entry.publishedSlug !== null ? [entry.publishedSlug] : [] };
}

/** Throws away unpublished changes: the draft goes back to what's live. */
export async function discardChanges(id: string, authorId: string | null): Promise<void> {
  const [entry] = await db().select().from(entries).where(eq(entries.id, id)).limit(1);
  if (!entry?.publishedVersionId) return;
  await db()
    .update(entries)
    .set({
      draftVersionId: entry.publishedVersionId,
      slug: entry.publishedSlug ?? entry.slug,
      updatedBy: authorId,
    })
    .where(eq(entries.id, id));
}

/** Brings back an earlier version as a new draft (history stays intact). */
export async function restoreVersion(
  id: string,
  versionId: string,
  authorId: string | null,
): Promise<string> {
  const v = await getVersion(versionId);
  if (!v || v.entryId !== id)
    throw new InvalidError([{ path: [], message: "That version doesn't belong to this page." }]);
  const newId = randomUUID();
  const when = v.createdAt.toISOString();
  await db().transaction(async (tx) => {
    await tx
      .insert(versions)
      .values({ id: newId, entryId: id, doc: v.doc, authorId, note: `Restored from ${when}` });
    await tx
      .update(entries)
      .set({ draftVersionId: newId, updatedBy: authorId })
      .where(eq(entries.id, id));
  });
  return newId;
}

/** Deletes a page and its history. The home page can't be deleted. */
export async function deleteEntry(id: string): Promise<{ slugs: string[] }> {
  const [entry] = await db().select().from(entries).where(eq(entries.id, id)).limit(1);
  if (!entry) return { slugs: [] };
  if (entry.slug === "" || entry.publishedSlug === "") {
    throw new InvalidError([{ path: [], message: "The home page can't be deleted." }]);
  }
  await db().transaction(async (tx) => {
    await tx.delete(versions).where(eq(versions.entryId, id));
    await tx.delete(entries).where(eq(entries.id, id));
  });
  return { slugs: entry.publishedSlug !== null ? [entry.publishedSlug] : [] };
}

/**
 * Adds an entry whose first version is published straight away (used to
 * import existing content). All or nothing: on any problem, nothing is saved.
 */
export async function importPublished(
  type: ContentType,
  slug: string,
  input: EntryDoc,
): Promise<string> {
  const doc = docSchema.parse(input);
  const issues = validateForPublish(type, doc, slug);
  if (issues.length) throw new InvalidError(issues);
  const id = randomUUID();
  const versionId = randomUUID();
  try {
    await db().transaction(async (tx) => {
      await tx
        .insert(versions)
        .values({ id: versionId, entryId: id, doc, authorId: null, note: "Imported" });
      await tx.insert(entries).values({
        id,
        type: type.id,
        slug,
        publishedSlug: slug,
        status: "published",
        draftVersionId: versionId,
        publishedVersionId: versionId,
        publishedAt: new Date(),
      });
    });
  } catch (err) {
    if (isDuplicate(err)) throw new SlugTakenError();
    throw err;
  }
  return id;
}

function isDuplicate(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "ER_DUP_ENTRY" || e?.cause?.code === "ER_DUP_ENTRY";
}
