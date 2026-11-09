"use client";

import { IconPhoto } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { EmptyStateClient } from "./EmptyStateClient";
import { controls as c } from "../ui/client";
import { MediaGrid } from "./MediaGrid";
import s from "./media.module.css";
import type { MediaInfo } from "./types";
import { Uploader } from "./Uploader";

/** The library page: upload, search, and every image with its alt-text status. */
export function MediaLibrary({
  initial,
  detailBase,
}: {
  initial: MediaInfo[];
  detailBase: string;
}) {
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((m) => `${m.filename} ${m.alt}`.toLowerCase().includes(q)) : items;
  }, [items, query]);
  const missingAlt = items.filter((m) => !m.alt.trim()).length;

  return (
    <>
      <Uploader onUploaded={(m) => setItems((list) => [m, ...list.filter((x) => x.id !== m.id)])} />
      <div className={s.toolbar}>
        <span className={c.meta}>
          {items.length} image{items.length === 1 ? "" : "s"}
          {missingAlt > 0 && ` · ${missingAlt} need${missingAlt === 1 ? "s" : ""} alt text`}
        </span>
        <input
          type="search"
          className={`${c.input} ${s.search}`}
          placeholder="Search by name or alt text"
          aria-label="Search images"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {shown.length ? (
        <MediaGrid items={shown} hrefFor={(m) => detailBase + m.id} />
      ) : (
        <EmptyStateClient
          icon={<IconPhoto size={24} stroke={2} aria-hidden />}
          title={items.length ? "No images match" : "No images yet"}
          text={
            items.length
              ? "Try another word."
              : "Upload images above, then use them in any page section."
          }
        />
      )}
    </>
  );
}
