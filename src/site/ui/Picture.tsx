import { focalPosition, mediaUrl, srcSet, type MediaInfo } from "@/cms/media/types";

/**
 * A media-library image: AVIF and WebP at every size, so each screen downloads
 * only what it needs. Width and height are set (no layout jump), and crops
 * center on the focal point.
 */
export function Picture({
  media,
  sizes,
  className,
  priority = false,
}: {
  media: MediaInfo;
  /** How wide the image shows, e.g. "100vw" or "(max-width: 720px) 100vw, 1200px". */
  sizes: string;
  className?: string;
  /** Load straight away (e.g. the first image on a page). */
  priority?: boolean;
}) {
  const fallback = media.widths.find((w) => w >= 960) ?? media.widths[media.widths.length - 1];
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet(media, "avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(media, "webp")} sizes={sizes} />
      <img
        src={mediaUrl(media, fallback, "webp")}
        alt={media.alt}
        width={media.width}
        height={media.height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        className={className}
        style={{ objectPosition: focalPosition(media) }}
      />
    </picture>
  );
}
