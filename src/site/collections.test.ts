import { describe, expect, it } from "vitest";
import { schemaFields } from "@/cms/content/fields";
import {
  createEntry,
  getEntry,
  InvalidError,
  listPublished,
  publish,
  saveDraft,
} from "@/cms/content/store";
import { validateForPublish, type EntryDoc } from "@/cms/content/types";
import { mediaRefs } from "@/cms/media/refs";
import { setupTestDatabase } from "@/test/db";
import { serviceType, workType } from "./cms";

setupTestDatabase();

const workDoc = (fields: Record<string, unknown>): EntryDoc => ({
  title: "Recompete win",
  seo: {},
  blocks: [],
  fields,
});

describe("case study and service forms", () => {
  it("are built from their fields, including references to services", () => {
    expect(schemaFields(workType.fields!).map((f) => [f.key, f.kind])).toEqual([
      ["client", "text"],
      ["summary", "text"],
      ["cover", "image"],
      ["services", "refs"],
      ["results", "list"],
    ]);
    expect(schemaFields(workType.fields!).find((f) => f.key === "services")).toMatchObject({
      ref: "service",
      max: 6,
    });
    expect(schemaFields(serviceType.fields!).find((f) => f.key === "order")).toMatchObject({
      kind: "number",
      min: 0,
      max: 999,
    });
  });
});

describe("publishing case studies", () => {
  it("needs a summary, but not sections", () => {
    expect(validateForPublish(workType, workDoc({ services: [] }), "recompete")).toEqual([
      { path: ["fields", "summary"], message: "Fill this in." },
    ]);
    expect(
      validateForPublish(workType, workDoc({ summary: "We won.", services: [] }), "recompete"),
    ).toEqual([]);
  });

  it("refuses a malformed service reference", () => {
    const issues = validateForPublish(
      workType,
      workDoc({ summary: "x", services: ["not-an-id"] }),
      "a",
    );
    expect(issues[0].path).toEqual(["fields", "services", 0]);
  });

  it("counts a cover image as an image the entry uses", () => {
    const id = "6b2d1c1e-6a39-4d43-9f27-0d0f0c8a1f11";
    expect(mediaRefs(workType, workDoc({ summary: "x", cover: id }))).toEqual([
      { id, path: ["fields", "cover"] },
    ]);
  });

  it("can't live at the work page's own address", async () => {
    await expect(createEntry(workType, { title: "x", slug: "" }, null)).rejects.toThrow(
      InvalidError,
    );
  });
});

describe("listing", () => {
  it("lists only live entries, with their documents", async () => {
    const a = await createEntry(serviceType, { title: "Brand", slug: "brand" }, null);
    await createEntry(serviceType, { title: "Draft only", slug: "draft-only" }, null);
    const base = (await getEntry(a))!.entry.draftVersionId;
    await saveDraft(
      serviceType,
      a,
      {
        doc: { title: "Brand", seo: {}, blocks: [], fields: { summary: "Who you are.", order: 2 } },
        slug: "brand",
        baseVersionId: base,
      },
      null,
    );
    await publish(serviceType, a, null);
    const live = await listPublished("service");
    expect(live.map((r) => [r.slug, r.doc.title, r.doc.fields?.order])).toEqual([
      ["brand", "Brand", 2],
    ]);
  });

  it("starts new entries with their type's default fields", async () => {
    const id = await createEntry(serviceType, { title: "Comms", slug: "comms" }, null);
    expect((await getEntry(id))?.draft.fields).toEqual({ order: 100 });
  });
});
