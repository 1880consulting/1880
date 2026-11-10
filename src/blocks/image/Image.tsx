import type { MediaInfo } from "@/cms/media/types";
import section from "@/site/section.module.css";
import { Picture } from "@/site/ui/Picture";
import { Reveal } from "@/site/ui/Reveal";
import type { ImageBlock } from "./schema";
import styles from "./Image.module.css";

export function ImageSection({
  block,
  media,
  priority = false,
}: {
  block: ImageBlock;
  media: MediaInfo | undefined;
  /** The first block on the page: load the image right away. */
  priority?: boolean;
}) {
  // Only the editor's preview can get here without an image (publishing checks for one).
  if (!media) {
    return (
      <section className={section.section}>
        <div className={section.wrap}>
          <p className={styles.missing}>Choose an image in the editor.</p>
        </div>
      </section>
    );
  }
  const full = block.layout === "full";
  const picture = (
    <Picture
      media={media}
      className={styles.img}
      sizes={full ? "100vw" : "(max-width: 1264px) calc(100vw - 2 * var(--gutter)), 1200px"}
      priority={priority}
    />
  );
  return (
    <section className={section.section}>
      <figure className={`${styles.figure} ${full ? styles.full : ""}`}>
        {full ? (
          <Reveal>{picture}</Reveal>
        ) : (
          <div className={section.wrap}>
            <Reveal>{picture}</Reveal>
          </div>
        )}
        {block.caption && (
          <figcaption className={full ? styles.caption : `${section.wrap}`}>
            <span
              className={full ? undefined : styles.caption}
              style={full ? undefined : { display: "block" }}
            >
              {block.caption}
            </span>
          </figcaption>
        )}
      </figure>
    </section>
  );
}
