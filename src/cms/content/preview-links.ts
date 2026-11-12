import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { hashToken, newToken } from "../staff/tokens";

/**
 * Shareable draft previews (PLAN D50). A link shows an entry's current draft,
 * whatever it is when the link is opened, until it expires or is turned off.
 * The token is 256 random bits; only its hash is stored.
 */

const { previewLinks: links, entries } = schema;

export const PREVIEW_LINK_DAYS = 7;

export interface PreviewLink {
  id: string;
  createdAt: Date;
  expiresAt: Date;
}

/** Creates a link. Returns the token (shown once, in the link) and its id. */
export async function createPreviewLink(
  entryId: string,
  authorId: string,
  days = PREVIEW_LINK_DAYS,
): Promise<{ id: string; token: string; expiresAt: Date }> {
  const id = randomUUID();
  const token = newToken();
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await db()
    .insert(links)
    .values({ id, tokenHash: hashToken(token), entryId, createdBy: authorId, expiresAt });
  return { id, token, expiresAt };
}

/** The entry's links that still work, newest first. */
export async function activePreviewLinks(entryId: string): Promise<PreviewLink[]> {
  return db()
    .select({ id: links.id, createdAt: links.createdAt, expiresAt: links.expiresAt })
    .from(links)
    .where(
      and(eq(links.entryId, entryId), isNull(links.revokedAt), gt(links.expiresAt, sql`now()`)),
    )
    .orderBy(desc(links.createdAt));
}

/** Turns a link off for good. Returns whether it belonged to this entry. */
export async function revokePreviewLink(entryId: string, id: string): Promise<boolean> {
  const [res] = await db()
    .update(links)
    .set({ revokedAt: sql`now()` })
    .where(and(eq(links.id, id), eq(links.entryId, entryId), isNull(links.revokedAt)));
  return res.affectedRows === 1;
}

/** The entry a token opens, if the link still works and the entry still exists. */
export async function resolvePreviewToken(
  token: string,
): Promise<{ entryId: string; expiresAt: Date } | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const [row] = await db()
    .select({ entryId: links.entryId, expiresAt: links.expiresAt })
    .from(links)
    .innerJoin(entries, eq(entries.id, links.entryId))
    .where(
      and(
        eq(links.tokenHash, hashToken(token)),
        isNull(links.revokedAt),
        gt(links.expiresAt, sql`now()`),
      ),
    )
    .limit(1);
  return row ?? null;
}
