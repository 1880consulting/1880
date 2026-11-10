"use client";

import { IconUpload } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { buttonClass, controls as c } from "../ui/client";
import s from "./media.module.css";
import type { MediaInfo } from "./types";
import { ACCEPT, MAX_MB, uploadFile } from "./upload-client";

type Row = { name: string; state: "uploading" | "done" | "existed" | "error"; message?: string };

/** Drop zone and file button. Uploads one file at a time and reports on each. */
export function Uploader({
  onUploaded,
  compact,
}: {
  onUploaded: (m: MediaInfo) => void;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [dragging, setDragging] = useState(false);

  async function upload(files: FileList | File[]) {
    const list = [...files];
    setRows(list.map((f) => ({ name: f.name, state: "uploading" })));
    for (const [i, file] of list.entries()) {
      try {
        const { media, existed } = await uploadFile(file);
        onUploaded(media);
        setRows((r) =>
          r.map((row, j) => (j === i ? { ...row, state: existed ? "existed" : "done" } : row)),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed.";
        setRows((r) => r.map((row, j) => (j === i ? { ...row, state: "error", message } : row)));
      }
    }
  }

  return (
    <>
      <div
        className={`${s.drop} ${dragging ? s.dragging : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
        }}
        style={compact ? { padding: 16 } : undefined}
      >
        <button
          type="button"
          className={buttonClass("primary")}
          onClick={() => input.current?.click()}
        >
          <IconUpload size={18} stroke={2} aria-hidden />
          Upload images
        </button>
        <span>or drop them here. JPEG, PNG, WebP, AVIF or GIF, up to {MAX_MB} MB each.</span>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {rows.length > 0 && (
        <ul className={s.uploads} aria-live="polite">
          {rows.map((r, i) => (
            <li key={i} className={r.state === "error" ? c.error : c.meta}>
              {r.state === "uploading" && `Uploading ${r.name}…`}
              {r.state === "done" &&
                `Uploaded ${r.name}. Add its alt text before using it on a page.`}
              {r.state === "existed" &&
                `${r.name} is already in the library, so the existing copy was used.`}
              {r.state === "error" && r.message}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
