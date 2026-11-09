import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb, db, schema } from "@/lib/db";
import { getSetting, setSetting } from "./settings";

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
  await db().delete(schema.settings);
});

describe("settings", () => {
  it("falls back to the default, then stores and updates a value", async () => {
    expect(await getSetting("inquiries.alertRecipients")).toEqual([]);
    await setSetting("inquiries.alertRecipients", ["a@example.com"]);
    await setSetting("inquiries.alertRecipients", ["a@example.com", "b@example.com"]);
    expect(await getSetting("inquiries.alertRecipients")).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
  });

  it("refuses values of the wrong shape", async () => {
    await expect(setSetting("inquiries.alertRecipients", ["not-an-email"])).rejects.toThrow();
  });
});
