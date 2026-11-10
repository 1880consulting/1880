import Link from "next/link";
import type { MediaInfo } from "@/cms/media/types";
import section from "../section.module.css";
import { Picture } from "../ui/Picture";
import type { ListedEntry } from "../pages";
import type { WorkFields } from "../collections";
import s from "./entries.module.css";

/** A case study on a listing: cover, client, title and summary, all one link. */
export function WorkCard({
  entry,
  media,
}: {
  entry: Pick<ListedEntry, "path" | "doc">;
  media: Record<string, MediaInfo>;
}) {
  const f = (entry.doc.fields ?? {}) as Partial<WorkFields>;
  const cover = f.cover ? media[f.cover] : undefined;
  return (
    <Link href={entry.path} className={s.card}>
      <div className={s.cardMedia}>
        {cover && (
          <Picture media={cover} className={s.cardImage} sizes="(max-width: 720px) 100vw, 600px" />
        )}
      </div>
      {f.client && <p className={section.eyebrow}>{f.client}</p>}
      <h2 className={s.cardTitle}>{entry.doc.title}</h2>
      {f.summary && <p className={s.cardSummary}>{f.summary}</p>}
    </Link>
  );
}
