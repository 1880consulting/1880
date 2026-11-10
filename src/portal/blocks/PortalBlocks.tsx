import type { MediaInfo } from "@/cms/media/types";
import { formatBytes } from "@/cms/media/types";
import { Picture } from "@/site/ui/Picture";
import s from "../document.module.css";
import type { PortalBlock } from "./schema";
import { videoEmbedUrl } from "./schema";

export interface PortalBlockContext {
  media: Record<string, MediaInfo>;
  files: Record<string, { filename: string; bytes: number }>;
  /** Address of a file, e.g. "/acme/d/<id>/files/" + id. */
  fileHref: (fileId: string) => string;
}

/** Paragraphs split on blank lines; lines starting "- " become a bulleted list. */
function Paragraphs({ text }: { text: string }) {
  return text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk, i) => {
      const lines = chunk.split("\n").map((l) => l.trim());
      if (lines.every((l) => /^[-•*]\s+/.test(l)))
        return (
          <ul key={i}>
            {lines.map((l, j) => (
              <li key={j}>{l.replace(/^[-•*]\s+/, "")}</li>
            ))}
          </ul>
        );
      return (
        <p key={i}>
          {lines.map((l, j) => (
            <span key={j}>
              {j > 0 && <br />}
              {l}
            </span>
          ))}
        </p>
      );
    });
}

function Block({ block, context }: { block: PortalBlock; context: PortalBlockContext }) {
  switch (block.type) {
    case "text":
      return (
        <section className={`${s.block} ${s.text}`}>
          {block.heading && <h2>{block.heading}</h2>}
          <Paragraphs text={block.body} />
        </section>
      );
    case "stats":
      return (
        <section className={s.block}>
          {block.heading && <h2>{block.heading}</h2>}
          <dl className={s.stats}>
            {block.stats.map((st, i) => (
              <div key={i} className={s.stat}>
                <dt>{st.label}</dt>
                <dd>{st.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      );
    case "image": {
      const m = context.media[block.image];
      if (!m) return null;
      return (
        <section className={s.block}>
          <figure className={s.figure}>
            <Picture media={m} sizes="(max-width: 800px) 100vw, 736px" />
            {block.caption && <figcaption>{block.caption}</figcaption>}
          </figure>
        </section>
      );
    }
    case "video": {
      const src = videoEmbedUrl(block.url);
      if (!src) return null;
      return (
        <section className={s.block}>
          <figure className={s.figure}>
            <div className={s.video}>
              <iframe
                src={src}
                title={block.caption || "Video"}
                loading="lazy"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
            {block.caption && <figcaption>{block.caption}</figcaption>}
          </figure>
        </section>
      );
    }
    case "files": {
      const list = block.files.map((id) => ({ id, f: context.files[id] })).filter((x) => x.f);
      if (!list.length) return null;
      return (
        <section className={s.block}>
          {block.heading && <h2>{block.heading}</h2>}
          <ul className={s.files}>
            {list.map(({ id, f }) => (
              <li key={id}>
                <a className={s.fileLink} href={`${context.fileHref(id)}?download=1`} download>
                  <span className={s.fileName}>{f!.filename}</span>
                  <span className={s.fileMeta}>
                    {f!.filename.split(".").pop()?.toUpperCase()} · {formatBytes(f!.bytes)} ·
                    Download
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      );
    }
    case "timeline":
      return (
        <section className={s.block}>
          {block.heading && <h2>{block.heading}</h2>}
          <ol className={s.timeline}>
            {block.items.map((it, i) => (
              <li key={i} className={`${s.milestone} ${it.done ? s.done : ""}`}>
                <p className={s.when}>
                  {it.when}
                  {it.done && <span className="visually-hidden"> (done)</span>}
                </p>
                <p className={s.milestoneTitle}>{it.title}</p>
                {it.detail && <p className={s.detail}>{it.detail}</p>}
              </li>
            ))}
          </ol>
        </section>
      );
  }
}

export function PortalBlocks({
  blocks,
  context,
}: {
  blocks: PortalBlock[];
  context: PortalBlockContext;
}) {
  return blocks.map((b, i) => <Block key={i} block={b} context={context} />);
}
