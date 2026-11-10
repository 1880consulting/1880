import "server-only";
import { and, count, eq, gt, lt, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

const { rateLimits: t } = schema;

/**
 * Counts attempts per key in a sliding window, stored in MySQL so it holds
 * across restarts and server processes. Returns ok: false once `limit`
 * attempts have been made within `windowSeconds`.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const since = sql`now(3) - interval ${windowSeconds} second`;
  const [row] = await db()
    .select({ n: count(), oldest: sql<string>`min(${t.createdAt})` })
    .from(t)
    .where(and(eq(t.key, key), gt(t.createdAt, since)));
  if (row.n >= limit) {
    const oldest = new Date(row.oldest).getTime();
    const retry = Math.ceil((oldest + windowSeconds * 1000 - Date.now()) / 1000);
    return { ok: false, retryAfterSeconds: Math.max(1, retry) };
  }
  await db().insert(t).values({ key });
  // Now and then, clear out rows older than a day.
  if (Math.random() < 0.02) {
    await db()
      .delete(t)
      .where(lt(t.createdAt, sql`now() - interval 1 day`));
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/** Forget a key's attempts, e.g. after a successful sign-in. */
export async function clearRateLimit(key: string): Promise<void> {
  await db().delete(t).where(eq(t.key, key));
}
