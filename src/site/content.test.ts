import { describe, expect, it } from "vitest";
import { blockSchema } from "@/blocks";
import { home } from "./content";

describe("site content", () => {
  it("every home-page block matches its schema", () => {
    for (const block of home.blocks) {
      const result = blockSchema.safeParse(block);
      expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    }
  });

  it("nav anchors point at sections that exist", () => {
    const anchors = home.blocks.flatMap((b) => ("anchor" in b && b.anchor ? [b.anchor] : []));
    expect(anchors).toEqual(expect.arrayContaining(["what-we-do", "contact"]));
  });
});
