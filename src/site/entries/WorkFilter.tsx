"use client";

import { useState } from "react";
import type { MediaInfo } from "@/cms/media/types";
import type { WorkFields } from "../collections";
import type { ListedEntry } from "../pages";
import s from "./entries.module.css";
import { WorkCard } from "./WorkCard";

/** The case-study grid with service filters. Filtering happens in the browser, so the page stays static. */
export function WorkFilter({
  work,
  services,
  media,
}: {
  work: Pick<ListedEntry, "id" | "path" | "doc">[];
  services: { id: string; title: string }[];
  media: Record<string, MediaInfo>;
}) {
  const [only, setOnly] = useState<string | null>(null);
  const used = services.filter((sv) =>
    work.some((w) => (w.doc.fields as Partial<WorkFields>)?.services?.includes(sv.id)),
  );
  const shown = only
    ? work.filter((w) => (w.doc.fields as Partial<WorkFields>)?.services?.includes(only))
    : work;

  return (
    <>
      {used.length > 1 && (
        <div className={s.filters} role="group" aria-label="Show case studies for">
          <button
            type="button"
            className={s.filter}
            aria-pressed={only === null}
            onClick={() => setOnly(null)}
          >
            All
          </button>
          {used.map((sv) => (
            <button
              key={sv.id}
              type="button"
              className={s.filter}
              aria-pressed={only === sv.id}
              onClick={() => setOnly(sv.id)}
            >
              {sv.title}
            </button>
          ))}
        </div>
      )}
      <p className="visually-hidden" role="status">
        {shown.length} case stud{shown.length === 1 ? "y" : "ies"} shown
      </p>
      <ul className={s.grid}>
        {shown.map((w) => (
          <li key={w.id}>
            <WorkCard entry={w} media={media} />
          </li>
        ))}
      </ul>
    </>
  );
}
