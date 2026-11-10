/**
 * What pages and the editor need to know about an image. Plain data, safe
 * for the browser. Files are served from /media/<id>/<rev>/<width>.<format>.
 */
export interface MediaInfo {
  id: string;
  rev: number;
  filename: string;
  width: number;
  height: number;
  bytes: number;
  alt: string;
  /** 0–1000 from the left/top. */
  focalX: number;
  focalY: number;
  widths: number[];
}

/** Sizes made for every image (never larger than the original). */
export const MEDIA_WIDTHS = [320, 640, 960, 1280, 1920, 2560];
export const MEDIA_FORMATS = ["avif", "webp"] as const;
export type MediaFormat = (typeof MEDIA_FORMATS)[number];

export const mediaUrl = (m: Pick<MediaInfo, "id" | "rev">, width: number, format: MediaFormat) =>
  `/media/${m.id}/${m.rev}/${width}.${format}`;

export const srcSet = (m: MediaInfo, format: MediaFormat) =>
  m.widths.map((w) => `${mediaUrl(m, w, format)} ${w}w`).join(", ");

/** The smallest width at least `target` pixels wide (for thumbnails). */
export const pickWidth = (m: MediaInfo, target: number) =>
  m.widths.find((w) => w >= target) ?? m.widths[m.widths.length - 1];

/** CSS object-position for the focal point, so crops keep the subject in frame. */
export const focalPosition = (m: Pick<MediaInfo, "focalX" | "focalY">) =>
  `${m.focalX / 10}% ${m.focalY / 10}%`;

export const formatBytes = (n: number) =>
  n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : `${(n / 1024 / 1024).toFixed(1)} MB`;

/** The 1200×630 JPEG used when a page is shared on social sites. */
export const shareImageUrl = (m: Pick<MediaInfo, "id" | "rev" | "focalX" | "focalY">) =>
  // The focal point is in the address, so moving it gives social sites a fresh image.
  `/media/${m.id}/${m.rev}/og.jpg?f=${m.focalX}-${m.focalY}`;
