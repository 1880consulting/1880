import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { imageBlock } from "@/blocks/image/schema";
import { pageType } from "@/site/cms";
import { setupTestDatabase } from "@/test/db";
import { blockFields } from "../content/fields";
import { createEntry, getEntry, saveDraft } from "../content/store";
import type { EntryDoc } from "../content/types";
import { processImage, UploadError } from "./process";
import { mediaIssues, mediaRefs } from "./refs";
import {
  addMedia,
  deleteMedia,
  getMedia,
  MediaInUseError,
  mediaUsage,
  readMediaFile,
  replaceMedia,
  updateMedia,
} from "./store";

setupTestDatabase();

/** A test photo: `w`×`h`, with camera data (including GPS) like a phone photo. */
async function photo(w: number, h: number, color = "#3366cc", orientation?: number) {
  return sharp({ create: { width: w, height: h, channels: 3, background: color } })
    .jpeg({ quality: 90 })
    .withExif({
      IFD0: { Make: "TestPhone", Model: "Model 1" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "38/1 53/1 0/1" },
    })
    .withMetadata(orientation ? { orientation } : {})
    .toBuffer();
}

describe("processing uploads", () => {
  it("makes every size up to the original, in AVIF and WebP", async () => {
    const p = await processImage(await photo(1500, 1000));
    expect(p).toMatchObject({
      mime: "image/jpeg",
      width: 1500,
      height: 1000,
      widths: [320, 640, 960, 1280, 1500],
    });
    expect(p.files.map((f) => f.name)).toEqual(
      expect.arrayContaining(["320.avif", "320.webp", "1500.webp", "original"]),
    );
    const big = await sharp(p.files.find((f) => f.name === "1500.webp")!.data).metadata();
    expect([big.format, big.width]).toEqual(["webp", 1500]);
  });

  it("never makes anything larger than the original", async () => {
    expect((await processImage(await photo(200, 100))).widths).toEqual([200]);
  });

  it("removes camera data such as GPS location from served files", async () => {
    const input = await photo(800, 600);
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const p = await processImage(input);
    for (const f of p.files.filter((f) => f.name !== "original")) {
      expect((await sharp(f.data).metadata()).exif).toBeUndefined();
    }
  });

  it("turns sideways phone photos the right way up", async () => {
    // Stored 800×600, but the camera says "rotate 90°": it's really 600×800.
    const p = await processImage(await photo(800, 600, "#888", 6));
    expect([p.width, p.height]).toEqual([600, 800]);
    const out = await sharp(p.files.find((f) => f.name === "600.webp")!.data).metadata();
    expect([out.width, out.height]).toEqual([600, 800]);
  });

  it("refuses files that aren't images, unsupported types and oversized uploads", async () => {
    await expect(processImage(Buffer.from("<html>not an image</html>"))).rejects.toThrow(
      UploadError,
    );
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
    await expect(processImage(svg)).rejects.toThrow(/isn't supported/);
    await expect(processImage(Buffer.alloc(16 * 1024 * 1024))).rejects.toThrow(/over 15 MB/);
  });
});

describe("the library", () => {
  it("stores an upload once, even if it's uploaded twice", async () => {
    const file = await photo(700, 500);
    const a = await addMedia(file, "../../team photo?.jpg", "u1");
    const b = await addMedia(file, "copy.jpg", "u1");
    expect(a.existed).toBe(false);
    expect(b).toEqual({ media: a.media, existed: true });
    expect(a.media).toMatchObject({
      filename: "team photo.jpg",
      alt: "",
      focalX: 500,
      focalY: 500,
      rev: 1,
    });
  });

  it("serves sizes but never the original", async () => {
    const { media } = await addMedia(await photo(700, 500), "a.jpg", null);
    expect(await readMediaFile(media.id, 1, "640.webp")).toMatchObject({
      contentType: "image/webp",
    });
    expect(await readMediaFile(media.id, 1, "original")).toBeNull();
    expect(await readMediaFile(media.id, 1, "../original")).toBeNull();
    expect(await readMediaFile(media.id, 2, "640.webp")).toBeNull();
  });

  it("saves alt text and a focal point, within bounds", async () => {
    const { media } = await addMedia(await photo(700, 500), "a.jpg", null);
    await updateMedia(media.id, { alt: "  The team at work  ", focalX: 1200, focalY: -5 });
    expect(await getMedia(media.id)).toMatchObject({
      alt: "The team at work",
      focalX: 1000,
      focalY: 0,
    });
  });

  it("replaces the file behind an image, keeping alt text, and serves the new version", async () => {
    const { media } = await addMedia(await photo(700, 500, "#111"), "a.jpg", null);
    await updateMedia(media.id, { alt: "Logo", focalX: 500, focalY: 500 });
    const next = await replaceMedia(media.id, await photo(1000, 400, "#eee"), "b.png");
    expect(next).toMatchObject({
      id: media.id,
      rev: 2,
      width: 1000,
      height: 400,
      alt: "Logo",
      filename: "b.png",
    });
    expect(await readMediaFile(media.id, 2, "640.webp")).not.toBeNull();
    // The version just replaced stays for a while, for pages cached a moment ago…
    expect(await readMediaFile(media.id, 1, "640.webp")).not.toBeNull();
    // …and goes on the next replacement.
    await replaceMedia(media.id, await photo(900, 400, "#777"), "c.png");
    expect(await readMediaFile(media.id, 1, "640.webp")).toBeNull();
  });
});

describe("images on pages", () => {
  const docWith = (imageId: string): EntryDoc => ({
    title: "About",
    seo: {},
    blocks: [{ id: "b1", type: "image", image: imageId, layout: "framed" }],
  });

  it("finds a page's images, and won't publish without alt text or with a deleted image", async () => {
    const { media } = await addMedia(await photo(700, 500), "a.jpg", null);
    const refs = mediaRefs(pageType, docWith(media.id));
    expect(refs).toEqual([{ id: media.id, path: ["blocks", 0, "image"] }]);
    expect(mediaIssues(refs, { [media.id]: media })).toEqual([
      {
        path: ["blocks", 0, "image"],
        message: 'Add alt text to "a.jpg" in the media library first.',
      },
    ]);
    expect(mediaIssues(refs, {})[0].message).toMatch(/deleted/);
    expect(mediaIssues(refs, { [media.id]: { ...media, alt: "Desk" } })).toEqual([]);
  });

  it("knows which pages use an image, and won't delete it while they do", async () => {
    const { media } = await addMedia(await photo(700, 500), "a.jpg", null);
    const pageId = await createEntry(pageType, { title: "About", slug: "about" }, null);
    const base = (await getEntry(pageId))!.entry.draftVersionId;
    await saveDraft(
      pageType,
      pageId,
      { doc: docWith(media.id), slug: "about", baseVersionId: base },
      null,
    );
    expect(await mediaUsage(media.id)).toEqual([
      { id: pageId, type: "page", title: "About", live: false },
    ]);
    await expect(deleteMedia(media.id)).rejects.toThrow(MediaInUseError);

    const v2 = (await getEntry(pageId))!.entry.draftVersionId;
    await saveDraft(
      pageType,
      pageId,
      { doc: { ...docWith(""), blocks: [] }, slug: "about", baseVersionId: v2 },
      null,
    );
    await deleteMedia(media.id);
    expect(await getMedia(media.id)).toBeNull();
    expect(await readMediaFile(media.id, 1, "640.webp")).toBeNull();
  });

  it("describes an image field to the editor", () => {
    expect(blockFields(imageBlock)[0]).toEqual({
      kind: "image",
      key: "image",
      label: "Image",
      help: undefined,
      required: true,
    });
  });
});
