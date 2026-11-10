import { describe, expect, it, vi } from "vitest";
import { setupTestDatabase } from "@/test/db";
import journal from "../../drizzle/meta/_journal.json";
import { checkHealth } from "./health";

setupTestDatabase();

describe("health check", () => {
  it("is healthy when the database answers and every migration is applied", async () => {
    const h = await checkHealth();
    expect(h.ok).toBe(true);
    expect(h.checks.database.ok).toBe(true);
    expect(h.checks.database.ms).toBeGreaterThanOrEqual(0);
    expect(h.checks.migrations).toEqual({
      ok: true,
      applied: journal.entries.length,
      expected: journal.entries.length,
    });
  });
});

describe("health check without a database", () => {
  it("reports unhealthy without leaking the error", async () => {
    vi.resetModules();
    vi.doMock("./db", () => ({
      db: () => ({
        execute: () => Promise.reject(new Error("connect ECONNREFUSED 10.0.0.5:3306 user=secret")),
      }),
    }));
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkHealth: check } = await import("./health");
    const h = await check();
    expect(h).toEqual({
      ok: false,
      checks: {
        database: { ok: false },
        migrations: { ok: false, expected: journal.entries.length },
      },
    });
    expect(JSON.stringify(h)).not.toMatch(/ECONNREFUSED|secret|10\.0\.0\.5/);
    quiet.mockRestore();
    vi.doUnmock("./db");
  });
});
