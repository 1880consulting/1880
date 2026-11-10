import { describe, expect, it } from "vitest";
import { z } from "zod";
import { setupTestDatabase } from "@/test/db";
import { blockFields } from "./fields";
import {
  ConflictError,
  createEntry,
  deleteEntry,
  discardChanges,
  findRedirect,
  getEntry,
  getPublishedBySlug,
  importPublished,
  InvalidError,
  listEntries,
  listVersions,
  publish,
  restoreVersion,
  saveDraft,
  SlugTakenError,
  unpublish,
} from "./store";
import { defineBlock, slugify, type ContentType, type EntryDoc } from "./types";

setupTestDatabase();

// A made-up content type: the engine must work without knowing anything about 1880.
const note = defineBlock({
  type: "note",
  label: "Note",
  schema: z.object({
    type: z.literal("note"),
    text: z.string().min(1).max(20).meta({ title: "Text" }),
    link: z.object({ label: z.string().min(1), href: z.string().min(1) }).optional(),
  }),
  defaults: { text: "Hello" },
});
const T: ContentType = {
  id: "page",
  label: "Page",
  plural: "Pages",
  path: (s) => (s ? `/${s}` : "/"),
  reservedSlugs: ["admin"],
  blocks: [note],
  allowHome: true,
};

const doc = (title: string, text = "Hi"): EntryDoc => ({
  title,
  seo: {},
  blocks: [{ id: "b1", type: "note", text }],
});

async function draftOf(id: string) {
  return (await getEntry(id))!.entry.draftVersionId;
}

async function newPublished(title: string, slug: string) {
  const id = await createEntry(T, { title, slug }, null);
  await saveDraft(T, id, { doc: doc(title), slug, baseVersionId: await draftOf(id) }, null);
  await publish(T, id, null);
  return id;
}

describe("creating pages", () => {
  it("starts as an untitled draft with no sections", async () => {
    const id = await createEntry(T, { title: "About", slug: "about" }, "u1");
    const e = await getEntry(id);
    expect(e?.entry).toMatchObject({ slug: "about", status: "draft", publishedVersionId: null });
    expect(e?.draft).toEqual({ title: "About", seo: {}, blocks: [], fields: {} });
    expect(await listEntries("page")).toEqual([
      expect.objectContaining({ id, title: "About", hasChanges: false }),
    ]);
  });

  it("refuses reserved, malformed and taken addresses", async () => {
    await expect(createEntry(T, { title: "x", slug: "admin" }, null)).rejects.toThrow(InvalidError);
    await expect(createEntry(T, { title: "x", slug: "About Us" }, null)).rejects.toThrow(
      InvalidError,
    );
    await expect(createEntry(T, { title: "x", slug: "" }, null)).rejects.toThrow(InvalidError);
    await createEntry(T, { title: "x", slug: "about" }, null);
    await expect(createEntry(T, { title: "y", slug: "about" }, null)).rejects.toThrow(
      SlugTakenError,
    );
  });

  it("suggests addresses from titles", () => {
    expect(slugify("Strategic Marketing & Communications")).toBe(
      "strategic-marketing-and-communications",
    );
    expect(slugify("  Café — Privacy!  ")).toBe("cafe-privacy");
  });
});

describe("saving", () => {
  it("keeps every save as a version", async () => {
    const id = await createEntry(T, { title: "About", slug: "about" }, null);
    const v1 = await saveDraft(
      T,
      id,
      { doc: doc("About", "one"), slug: "about", baseVersionId: await draftOf(id) },
      "u1",
    );
    await saveDraft(T, id, { doc: doc("About", "two"), slug: "about", baseVersionId: v1 }, "u1");
    expect((await getEntry(id))?.draft.blocks[0]).toMatchObject({ text: "two" });
    expect(await listVersions(id)).toHaveLength(3); // created + 2 saves
  });

  it("won't overwrite someone else's newer save", async () => {
    const id = await createEntry(T, { title: "About", slug: "about" }, null);
    const base = await draftOf(id);
    await saveDraft(T, id, { doc: doc("Mine"), slug: "about", baseVersionId: base }, "a");
    await expect(
      saveDraft(T, id, { doc: doc("Theirs"), slug: "about", baseVersionId: base }, "b"),
    ).rejects.toThrow(ConflictError);
    expect((await getEntry(id))?.draft.title).toBe("Mine");
  });

  it("allows incomplete drafts, but not incomplete publishing", async () => {
    const id = await createEntry(T, { title: "About", slug: "about" }, null);
    await saveDraft(
      T,
      id,
      { doc: doc("", ""), slug: "about", baseVersionId: await draftOf(id) },
      null,
    );
    const err = await publish(T, id, null).catch((e) => e);
    expect(err).toBeInstanceOf(InvalidError);
    expect(err.issues).toEqual(
      expect.arrayContaining([
        { path: ["title"], message: "Give the page a title." },
        { path: ["blocks", 0, "text"], message: "Fill this in." },
      ]),
    );
  });

  it("leaves hidden sections out of the publish check", async () => {
    const id = await createEntry(T, { title: "About", slug: "about" }, null);
    const d: EntryDoc = {
      title: "About",
      seo: {},
      blocks: [
        { id: "a", type: "note", text: "ok" },
        { id: "b", type: "note", text: "", hidden: true },
      ],
    };
    await saveDraft(T, id, { doc: d, slug: "about", baseVersionId: await draftOf(id) }, null);
    await expect(publish(T, id, null)).resolves.toEqual({ slugs: ["about"] });
  });
});

describe("publishing", () => {
  it("makes the draft live, and later edits stay unpublished until the next publish", async () => {
    const id = await newPublished("About", "about");
    expect(await getPublishedBySlug("page", "about")).toMatchObject({ title: "About" });
    await saveDraft(
      T,
      id,
      { doc: doc("About v2"), slug: "about", baseVersionId: await draftOf(id) },
      null,
    );
    expect((await getPublishedBySlug("page", "about"))?.title).toBe("About");
    expect((await listEntries("page"))[0].hasChanges).toBe(true);
    await publish(T, id, null);
    expect((await getPublishedBySlug("page", "about"))?.title).toBe("About v2");
  });

  it("redirects the old address when a page moves, and keeps chains short", async () => {
    const id = await newPublished("Team", "team");
    const move = async (slug: string) => {
      await saveDraft(T, id, { doc: doc("Team"), slug, baseVersionId: await draftOf(id) }, null);
      return publish(T, id, null);
    };
    expect(await move("people")).toEqual({ slugs: ["people", "team"] });
    expect(await findRedirect("/team")).toEqual({ toPath: "/people", code: 308 });
    expect(await getPublishedBySlug("page", "team")).toBeNull();

    await move("our-people");
    expect(await findRedirect("/team")).toMatchObject({ toPath: "/our-people" });
    expect(await findRedirect("/people")).toMatchObject({ toPath: "/our-people" });

    await move("team"); // back where it started: /team is a page again
    expect(await findRedirect("/team")).toBeNull();
    expect(await findRedirect("/our-people")).toMatchObject({ toPath: "/team" });
  });

  it("can be undone: discard changes, restore a version, unpublish", async () => {
    const id = await newPublished("About", "about");
    await saveDraft(
      T,
      id,
      { doc: doc("Oops"), slug: "about", baseVersionId: await draftOf(id) },
      null,
    );
    await discardChanges(id, null);
    expect((await getEntry(id))?.draft.title).toBe("About");

    const versions = await listVersions(id);
    const created = versions[versions.length - 1];
    await restoreVersion(id, created.id, "u1");
    expect((await getEntry(id))?.draft).toEqual({
      title: "About",
      seo: {},
      blocks: [],
      fields: {},
    });
    expect((await listVersions(id))[0].note).toMatch(/^Restored from/);

    expect(await unpublish(id, null)).toEqual({ slugs: ["about"] });
    expect(await getPublishedBySlug("page", "about")).toBeNull();
  });

  it("deletes pages, but never the home page", async () => {
    const id = await newPublished("About", "about");
    expect(await deleteEntry(id)).toEqual({ slugs: ["about"] });
    expect(await getEntry(id)).toBeNull();
    const home = await importPublished(T, "", doc("Home"));
    await expect(deleteEntry(home)).rejects.toThrow(InvalidError);
  });
});

describe("edit forms", () => {
  it("are described by the block's schema", () => {
    expect(blockFields(note)).toEqual([
      {
        kind: "text",
        key: "text",
        label: "Text",
        help: undefined,
        required: true,
        maxLength: 20,
        multiline: false,
      },
      {
        kind: "group",
        key: "link",
        label: "Link",
        help: undefined,
        required: false,
        fields: [
          {
            kind: "text",
            key: "label",
            label: "Label",
            help: undefined,
            required: true,
            maxLength: undefined,
            multiline: false,
          },
          {
            kind: "text",
            key: "href",
            label: "Href",
            help: undefined,
            required: true,
            maxLength: undefined,
            multiline: false,
          },
        ],
      },
    ]);
  });
});
