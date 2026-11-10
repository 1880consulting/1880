import Link from "next/link";
import { RenderBlocks, visibleBlocks } from "@/blocks";
import type { EntryDoc } from "@/cms/content/types";
import type { MediaInfo } from "@/cms/media/types";
import type { ServiceFields, WorkFields } from "../collections";
import type { ListedEntry } from "../pages";
import section from "../section.module.css";
import { Picture } from "../ui/Picture";
import { Reveal } from "../ui/Reveal";
import s from "./entries.module.css";
import { WorkCard } from "./WorkCard";

/**
 * A case study's or service's page: a header from its fields, its cover and
 * results, its sections, and links to related entries. Used by the public
 * pages and by Studio's live preview, so both always match.
 */
export function EntryView({
  type,
  doc,
  media,
  services,
  relatedWork,
  email,
}: {
  type: "work" | "service";
  doc: EntryDoc;
  media: Record<string, MediaInfo>;
  /** Published services (to name a case study's services). */
  services: Pick<ListedEntry, "id" | "path" | "doc">[];
  /** Published case studies that use this service (service pages only). */
  relatedWork?: Pick<ListedEntry, "id" | "path" | "doc">[];
  email: string;
}) {
  const f = (doc.fields ?? {}) as Partial<WorkFields & ServiceFields>;
  const cover = f.cover ? media[f.cover] : undefined;
  const tags = type === "work" ? services.filter((sv) => f.services?.includes(sv.id)) : [];
  const blocks = visibleBlocks(doc);

  return (
    <>
      <section data-tone="ink" className={`${section.section} ${s.header}`}>
        <div className={`${section.wrap} ${s.headerInner}`}>
          <p className={section.eyebrow}>
            {type === "work" ? f.client || "// Case study" : "// Service"}
          </p>
          <h1 className={s.title}>{doc.title || "Untitled"}</h1>
          {f.summary && <p className={s.summary}>{f.summary}</p>}
          {tags.length > 0 && (
            <ul className={s.tags} aria-label="Services">
              {tags.map((t) => (
                <li key={t.id}>
                  <Link className={s.tag} href={t.path}>
                    {t.doc.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {cover && <Picture media={cover} className={s.cover} sizes="100vw" priority />}

      {type === "work" && f.results && f.results.length > 0 && (
        <section className={`${section.section} ${s.band}`}>
          <div className={`${section.wrap} ${s.bandInner}`}>
            <p className={section.eyebrow}>{"// Results"}</p>
            <Reveal as="ul" className={s.results}>
              {f.results.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </Reveal>
          </div>
        </section>
      )}

      {blocks.length > 0 && <RenderBlocks blocks={blocks} context={{ email, media }} />}

      {relatedWork && relatedWork.length > 0 && (
        <section className={`${section.section} ${section.sunken} ${s.band}`}>
          <div className={`${section.wrap} ${s.bandInner}`}>
            <p className={section.eyebrow}>{"// Related work"}</p>
            <ul className={s.grid}>
              {relatedWork.slice(0, 4).map((w) => (
                <li key={w.id}>
                  <WorkCard entry={w} media={media} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className={`${section.section} ${s.band}`}>
        <div className={section.wrap}>
          <Link className={s.back} href={type === "work" ? "/work" : "/services"}>
            {type === "work" ? "All case studies" : "All services"}
          </Link>
        </div>
      </section>
    </>
  );
}
