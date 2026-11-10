import { afterAll, beforeAll, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { closeDb, db, schema } from "@/lib/db";

/**
 * Database tests: call once at the top of a test file. Skips the file's tests
 * when MySQL isn't running, and empties every table before each test.
 */
export function setupTestDatabase() {
  let reachable = true;
  beforeAll(async () => {
    try {
      await db().select().from(schema.settings).limit(1);
    } catch {
      reachable = false;
      return;
    }
    // Every test empties every table, so refuse anything but a test database.
    const [rows] = (await db().execute(sql`select database() as name`)) as unknown as [
      { name: string }[],
    ];
    const name = rows[0]?.name ?? "";
    if (!name.endsWith("_test"))
      throw new Error(
        `Tests only run against a database whose name ends in "_test" (got "${name}"). Check TEST_DATABASE_URL.`,
      );
  });
  afterAll(async () => {
    await closeDb();
  });
  beforeEach(async (ctx) => {
    if (!reachable) ctx.skip();
    for (const table of [
      schema.inquiries,
      schema.settings,
      schema.staffUsers,
      schema.staffSessions,
      schema.staffTokens,
      schema.rateLimits,
      schema.auditLog,
      schema.entries,
      schema.entryVersions,
      schema.redirects,
      schema.media,
      schema.mediaBlobs,
      schema.tenants,
      schema.clientUsers,
      schema.memberships,
      schema.clientSessions,
      schema.clientTokens,
      schema.documents,
      schema.documentVersions,
      schema.documentFiles,
      schema.documentEvents,
    ]) {
      await db().delete(table);
    }
  });
}
