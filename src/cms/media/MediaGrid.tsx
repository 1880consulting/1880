"use client";

import { Badge, controls as c } from "../ui/client";
import s from "./media.module.css";
import { formatBytes, mediaUrl, pickWidth, type MediaInfo } from "./types";

/** Thumbnails of library images. Links (library page) or buttons (picker). */
export function MediaGrid({
  items,
  hrefFor,
  onPick,
  selectedId,
}: {
  items: MediaInfo[];
  hrefFor?: (m: MediaInfo) => string;
  onPick?: (m: MediaInfo) => void;
  selectedId?: string;
}) {
  return (
    <ul className={s.grid}>
      {items.map((m) => {
        const body = (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- library thumbnail */}
            <img
              className={s.thumb}
              src={mediaUrl(m, pickWidth(m, 320), "webp")}
              alt=""
              loading="lazy"
            />
            <span className={s.cardBody}>
              <span className={s.name}>{m.filename}</span>
              <span className={c.meta}>
                {m.width} × {m.height} · {formatBytes(m.bytes)}
              </span>
              {!m.alt.trim() && <Badge tone="warning">Needs alt text</Badge>}
            </span>
          </>
        );
        const cls = `${s.card} ${selectedId === m.id ? s.selected : ""}`;
        return (
          <li key={m.id}>
            {hrefFor ? (
              <a
                className={cls}
                href={hrefFor(m)}
                aria-label={`${m.filename}${m.alt ? `: ${m.alt}` : ", needs alt text"}`}
              >
                {body}
              </a>
            ) : (
              <button
                type="button"
                className={cls}
                onClick={() => onPick?.(m)}
                aria-pressed={selectedId === m.id}
              >
                {body}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
