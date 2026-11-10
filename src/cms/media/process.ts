import "server-only";
import { createHash } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { MEDIA_FORMATS, MEDIA_WIDTHS, type MediaFormat } from "./types";

/** Uploads larger than this are refused. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
/** Refuse absurd pixel counts (and "decompression bombs"). */
const MAX_PIXELS = 50_000_000;
const ACCEPTED = new Set(["jpeg", "png", "webp", "avif", "gif"]);
export const ACCEPTED_LABEL = "JPEG, PNG, WebP, AVIF or GIF";

export class UploadError extends Error {}

export interface Processed {
  mime: string;
  width: number;
  height: number;
  sha256: string;
  widths: number[];
  /** Files to store: `<width>.<format>`, plus the original (never served). */
  files: { name: string; data: Buffer; contentType: string }[];
}

const QUALITY: Record<MediaFormat, number> = { avif: 55, webp: 78 };

/**
 * Checks an upload is a real image and makes every size and format.
 * Turns photos the right way up, and drops camera data such as GPS location
 * from everything that gets served.
 */
export async function processImage(input: Buffer): Promise<Processed> {
  if (input.length > MAX_UPLOAD_BYTES)
    throw new UploadError("That file is over 15 MB. Use a smaller image.");
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    throw new UploadError(`That isn't an image we can use. Upload a ${ACCEPTED_LABEL} file.`);
  }
  if (!meta.format || !ACCEPTED.has(meta.format)) {
    throw new UploadError(`That file type isn't supported. Upload a ${ACCEPTED_LABEL} file.`);
  }

  // Width and height after turning the photo the right way up.
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = rotated ? meta.height! : meta.width!;
  const height = rotated ? meta.width! : meta.height!;
  if (!width || !height) throw new UploadError("That image has no size. Try exporting it again.");

  const widths = MEDIA_WIDTHS.filter((w) => w < width);
  widths.push(Math.min(width, MEDIA_WIDTHS[MEDIA_WIDTHS.length - 1]));
  const uniqueWidths = [...new Set(widths)].sort((a, b) => a - b);

  const base = sharp(input, { limitInputPixels: MAX_PIXELS, animated: false }).rotate();
  const files: Processed["files"] = [];
  for (const w of uniqueWidths) {
    const resized = base.clone().resize({ width: w, withoutEnlargement: true });
    for (const format of MEDIA_FORMATS) {
      const data = await resized
        .clone()
        .toFormat(format, { quality: QUALITY[format], effort: format === "avif" ? 2 : 4 })
        .toBuffer();
      files.push({ name: `${w}.${format}`, data, contentType: `image/${format}` });
    }
  }
  files.push({ name: "original", data: input, contentType: `image/${meta.format}` });

  return {
    mime: `image/${meta.format}`,
    width,
    height,
    sha256: createHash("sha256").update(input).digest("hex"),
    widths: uniqueWidths,
    files,
  };
}

/** Width × height of share images (the size Facebook, LinkedIn and X recommend). */
export const SHARE_SIZE = { width: 1200, height: 630 };

/** A JPEG for social sharing: cropped to 1200×630 around the focal point, no camera data. */
export async function makeShareImage(
  original: Buffer,
  focalX: number,
  focalY: number,
): Promise<Buffer> {
  const img = sharp(original, { limitInputPixels: MAX_PIXELS }).rotate();
  const { width = 0, height = 0 } = await img
    .clone()
    .metadata()
    .then(async (m) => {
      const turned = (m.orientation ?? 1) >= 5;
      return { width: turned ? m.height : m.width, height: turned ? m.width : m.height };
    });
  const scale = Math.max(SHARE_SIZE.width / width, SHARE_SIZE.height / height);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const left = Math.min(
    Math.max(0, Math.round((focalX / 1000) * w - SHARE_SIZE.width / 2)),
    w - SHARE_SIZE.width,
  );
  const top = Math.min(
    Math.max(0, Math.round((focalY / 1000) * h - SHARE_SIZE.height / 2)),
    h - SHARE_SIZE.height,
  );
  return img
    .resize(w, h)
    .extract({ left, top, width: SHARE_SIZE.width, height: SHARE_SIZE.height })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}
