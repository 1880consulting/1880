import { describe, expect, it } from "vitest";
import { blockFields } from "../content/fields";
import { servicesBlock } from "@/blocks/services/schema";
import { blockSummary, getAt, issueMap, newBlock, setAt, tidyDoc, type BlockType } from "./doc";

const services: BlockType = { ...servicesBlock, fields: blockFields(servicesBlock) };

describe("editor document helpers", () => {
  it("updates nested values without touching the original", () => {
    const doc = { blocks: [{ id: "a", items: ["x"] }] };
    const next = setAt(doc, ["blocks", 0, "items", 1], "y");
    expect(next).toEqual({ blocks: [{ id: "a", items: ["x", "y"] }] });
    expect(doc.blocks[0].items).toEqual(["x"]);
    expect(getAt(next, ["blocks", 0, "items", 1])).toBe("y");
  });

  it("starts a new block from its defaults with a fresh id", () => {
    const a = newBlock(services);
    const b = newBlock(services);
    expect(a).toMatchObject({ type: "services", title: "What we do", items: ["First service"] });
    expect(a.id).not.toBe(b.id);
  });

  it("treats blank optional fields as not set, so an empty button means no button", () => {
    const tidy = tidyDoc(
      {
        title: "Home",
        seo: { title: "  ", description: "" },
        blocks: [
          {
            id: "a",
            type: "services",
            anchor: "",
            eyebrow: "",
            title: "T",
            items: ["x"],
            button: { label: "", href: "" },
          },
          {
            id: "b",
            type: "services",
            title: "T",
            items: ["x"],
            button: { label: "Go", href: "" },
          },
        ],
      },
      [services],
    );
    expect(tidy.seo).toEqual({});
    expect(tidy.blocks[0]).toEqual({ id: "a", type: "services", title: "T", items: ["x"] });
    // A half-filled button stays, so publishing can point at the missing part.
    expect(tidy.blocks[1].button).toEqual({ label: "Go", href: "" });
  });

  it("summarizes a block by its main text, not its link name", () => {
    expect(
      blockSummary(
        { id: "a", type: "services", anchor: "what-we-do", title: "What we do", items: [] },
        services,
      ),
    ).toBe("What we do");
  });

  it("indexes server issues by field path", () => {
    expect(
      issueMap([{ path: ["blocks", 2, "title"], message: "Fill this in." }]).get("blocks.2.title"),
    ).toBe("Fill this in.");
  });
});

describe("repeatable groups", () => {
  it("become an items field, and tidy each item", async () => {
    const { z } = await import("zod");
    const { defineBlock } = await import("../content/types");
    const def = defineBlock({
      type: "stats",
      label: "Stats",
      schema: z.object({
        type: z.literal("stats"),
        stats: z
          .array(z.object({ value: z.string().max(20), note: z.string().max(80).optional() }))
          .max(4)
          .meta({ title: "Stats", itemLabel: "Stat" }),
      }),
      defaults: { stats: [] },
    });
    const fields = blockFields(def);
    expect(fields[0]).toMatchObject({ kind: "items", itemLabel: "Stat", max: 4 });
    const t: BlockType = { ...def, fields };
    const tidy = tidyDoc(
      {
        title: "R",
        seo: {},
        blocks: [{ id: "a", type: "stats", stats: [{ value: "9", note: " " }] }],
      },
      [t],
    );
    expect(tidy.blocks[0].stats).toEqual([{ value: "9" }]);
    expect(blockSummary(tidy.blocks[0], t)).toBe("1 stat");
  });
});
