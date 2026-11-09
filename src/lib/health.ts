import "server-only";
import { sql } from "drizzle-orm";
import journal from "../../drizzle/meta/_journal.json";
import { db } from "./db";

/**
 * What /api/health reports (PLAN Phase 5: an uptime monitor watches it).
 * Only yes/no answers and timings: no error messages, versions or hostnames,
 * because anyone can open the address.
 */
export interface Health {
  ok: boolean;
  checks: {
    database: { ok: boolean; ms?: number };
    migrations: { ok: boolean; applied?: number; expected: number };
  };
}

const TIMEOUT_MS = 3000;

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timed out")), TIMEOUT_MS)),
  ]);
}

export async function checkHealth(): Promise<Health> {
  const expected = journal.entries.length;
  const started = performance.now();
  try {
    await withTimeout(db().execute(sql`select 1`));
    const ms = Math.round(performance.now() - started);
    // Every migration in drizzle/ should be applied; fewer means a deploy skipped `db:migrate`.
    const [rows] = (await withTimeout(
      db().execute(sql`select count(*) as n from __drizzle_migrations`),
    )) as unknown as [{ n: number }[]];
    const applied = Number(rows[0]?.n ?? 0);
    const migrations = { ok: applied >= expected, applied, expected };
    return { ok: migrations.ok, checks: { database: { ok: true, ms }, migrations } };
  } catch (err) {
    console.error("[health] database check failed:", err instanceof Error ? err.message : err);
    return { ok: false, checks: { database: { ok: false }, migrations: { ok: false, expected } } };
  }
}
