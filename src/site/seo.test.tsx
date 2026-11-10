import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { makeShareImage } from "@/cms/media/process";
import { mediaRefs } from "@/cms/media/refs";
import type { MediaInfo } from "@/cms/media/types";
import { pageType } from "./cms";
import { entryMetadata, JsonLd } from "./seo";

const img: MediaInfo = {
  id: "11111111-1111-4111-8111-111111111111",
  rev: 2,
  filename: "a.jpg",
  width: 2000,
  height: 1000,
  bytes: 1,
  alt: "Desk",
  focalX: 250,
  focalY: 500,
  widths: [320],
};
const doc = { title: "About", seo: {}, blocks: [] };

describe("search and share tags", () => {
  it("fall back to the entry's own text and cover", () => {
    const m = entryMetadata({
      doc,
      path: "/about",
      media: { [img.id]: img },
      fallbackDescription: "Who we are.",
      fallbackImage: img.id,
    });
    expect(m.title).toBe("About");
    expect(m.description).toBe("Who we are.");
    expect(m.alternates?.canonical).toBe("/about");
    expect(m.openGraph?.images).toEqual([
      {
        url: `https://1880.io/media/${img.id}/2/og.jpg?f=250-500`,
        width: 1200,
        height: 630,
        alt: "Desk",
      },
    ]);
    expect(m.robots).toBeUndefined();
  });

  it("use the editor's search title, description and image, and honor 'hide from search'", () => {
    const m = entryMetadata({
      doc: {
        ...doc,
        seo: { title: "About 1880", description: "Short.", image: img.id, noindex: true },
      },
      path: "/",
      media: { [img.id]: img },
      absoluteTitle: true,
    });
    expect(m.title).toEqual({ absolute: "About 1880" });
    expect(m.robots).toEqual({ index: false, follow: true });
    expect((m.twitter as { card?: string }).card).toBe("summary_large_image");
  });

  it("count a share image as an image the page uses", () => {
    expect(mediaRefs(pageType, { ...doc, seo: { image: img.id } })).toEqual([
      { id: img.id, path: ["seo", "image"] },
    ]);
  });
});

describe("structured data", () => {
  it("can't be broken out of by what an editor types", () => {
    const html = renderToStaticMarkup(
      <JsonLd data={{ name: "</script><script>alert(1)</script>" }} />,
    );
    expect(html).not.toContain("</script><script>");
    expect(html).toContain("\\u003c/script>");
    expect(JSON.parse(html.replace(/^<script[^>]*>|<\/script>$/g, ""))).toEqual({
      name: "</script><script>alert(1)</script>",
    });
  });
});

describe("share images", () => {
  it("are 1200×630 JPEGs cropped around the focal point", async () => {
    // Left half black, right half white: a focal point on the right keeps the white side.
    const src = await sharp({
      create: { width: 3000, height: 1000, channels: 3, background: "#000" },
    })
      .composite([
        {
          input: { create: { width: 1500, height: 1000, channels: 3, background: "#fff" } },
          left: 1500,
          top: 0,
        },
      ])
      .jpeg()
      .toBuffer();
    const out = await makeShareImage(src, 900, 500);
    const meta = await sharp(out).metadata();
    expect([meta.format, meta.width, meta.height, meta.exif]).toEqual([
      "jpeg",
      1200,
      630,
      undefined,
    ]);
    const { dominant } = await sharp(out).stats();
    expect(dominant.r).toBeGreaterThan(200);
  });
});

describe("summarize", () => {
  it("uses the page's own words, skipping ids and image ids", async () => {
    const { summarize } = await import("./seo");
    expect(
      summarize([
        { id: "abc", type: "image", image: "e17d4d10-uuid", caption: "Our office on Main Street." },
      ]),
    ).toBe("Our office on Main Street.");
    expect(summarize([])).toBeUndefined();
    const long = summarize([{ body: "word ".repeat(80) }])!;
    expect(long.length).toBeLessThanOrEqual(160);
    expect(long.endsWith("…")).toBe(true);
  });
});
