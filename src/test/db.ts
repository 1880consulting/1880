import { afterAll, beforeAll, beforeEach } from "vitest";
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
    }
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
    ]) {
      await db().delete(table);
    }
  });
}
