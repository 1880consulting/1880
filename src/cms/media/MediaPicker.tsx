"use client";

import { IconX } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { controls as c } from "../ui/client";
import { MediaGrid } from "./MediaGrid";
import s from "./media.module.css";
import type { MediaInfo } from "./types";
import { Uploader } from "./Uploader";

/**
 * Choose an image from the library, or upload one, in a dialog over the
 * editor. Uses the browser's own <dialog> (focus stays inside; Esc closes).
 */
export function MediaPicker({
  open,
  onClose,
  onPick,
  load,
  selectedId,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (m: MediaInfo) => void;
  load: () => Promise<MediaInfo[]>;
  selectedId?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<MediaInfo[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      load().then(setItems, () => setItems([]));
    } else if (!open && d.open) d.close();
  }, [open, load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter((m) => !q || `${m.filename} ${m.alt}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      onClose={onClose}
      aria-labelledby="picker-title"
      data-os
    >
      <div className={s.dialogHead}>
        <h2 id="picker-title" className={c.panelTitle}>
          Choose an image
        </h2>
        <input
          type="search"
          className={`${c.input} ${s.search}`}
          placeholder="Search"
          aria-label="Search images"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className={c.btn + " " + c.ghost}
          aria-label="Close"
          onClick={onClose}
        >
          <IconX size={18} stroke={2} aria-hidden />
        </button>
      </div>
      <div className={s.dialogBody}>
        <Uploader
          compact
          onUploaded={(m) => {
            setItems((list) => [m, ...(list ?? []).filter((x) => x.id !== m.id)]);
          }}
        />
        {items === null ? (
          <p className={c.meta}>Loading the library…</p>
        ) : shown.length === 0 ? (
          <p className={c.meta}>
            {items.length ? "No images match." : "The library is empty. Upload an image above."}
          </p>
        ) : (
          <MediaGrid items={shown} selectedId={selectedId} onPick={onPick} />
        )}
      </div>
    </dialog>
  );
}
