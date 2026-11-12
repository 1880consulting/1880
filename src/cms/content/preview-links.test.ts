import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db, schema } from "@/lib/db";
import { setupTestDatabase } from "@/test/db";
import {
  activePreviewLinks,
  createPreviewLink,
  resolvePreviewToken,
  revokePreviewLink,
} from "./preview-links";
import { createEntry, deleteEntry } from "./store";
import type { ContentType } from "./types";

setupTestDatabase();

const T: ContentType = {
  id: "page",
  label: "Page",
  plural: "Pages",
  path: (s) => `/${s}`,
  reservedSlugs: [],
  blocks: [],
};

describe("shared preview links", () => {
  it("open the entry until they're turned off", async () => {
    const id = await createEntry(T, { title: "Draft", slug: "draft" }, null);
    const link = await createPreviewLink(id, "u1");
    expect((await resolvePreviewToken(link.token))?.entryId).toBe(id);
    expect((await activePreviewLinks(id)).map((l) => l.id)).toEqual([link.id]);

    // Turning off only works through the entry it belongs to.
    expect(await revokePreviewLink("someone-else", link.id)).toBe(false);
    expect(await revokePreviewLink(id, link.id)).toBe(true);
    expect(await resolvePreviewToken(link.token)).toBeNull();
    expect(await activePreviewLinks(id)).toEqual([]);
  });

  it("stop working when they expire or the entry is deleted", async () => {
    const id = await createEntry(T, { title: "Draft", slug: "draft" }, null);
    const a = await createPreviewLink(id, "u1");
    const b = await createPreviewLink(id, "u1");
    await db()
      .update(schema.previewLinks)
      .set({ expiresAt: sql`now() - interval 1 minute` })
      .where(eq(schema.previewLinks.id, a.id));
    expect(await resolvePreviewToken(a.token)).toBeNull();
    expect(await resolvePreviewToken(b.token)).not.toBeNull();
    await deleteEntry(id);
    expect(await resolvePreviewToken(b.token)).toBeNull();
  });

  it("refuse anything that isn't a well-formed token", async () => {
    for (const t of ["", "short", "has spaces in it and is long enough", "x".repeat(200)])
      expect(await resolvePreviewToken(t)).toBeNull();
  });
});
