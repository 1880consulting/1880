"use client";

import { IconRefresh, IconTrash } from "@tabler/icons-react";
import { useRef, useState, useTransition } from "react";
import { Badge, Button, controls as c } from "../ui/client";
import s from "./media.module.css";
import { formatBytes, mediaUrl, pickWidth, type MediaInfo } from "./types";
import { ACCEPT, uploadFile } from "./upload-client";

type Result = { ok: true } | { ok: false; message: string };

export interface MediaDetailProps {
  media: MediaInfo;
  usage: { id: string; title: string; live: boolean; href: string }[];
  actions: {
    save: (input: { alt: string; focalX: number; focalY: number }) => Promise<Result>;
    replaced: () => Promise<void>;
    remove: () => Promise<Result>;
  };
}

/** One image: focal point, alt text, replace the file, delete. */
export function MediaDetail({ media: initial, usage, actions }: MediaDetailProps) {
  const [media, setMedia] = useState(initial);
  const [alt, setAlt] = useState(initial.alt);
  const [focal, setFocal] = useState({ x: initial.focalX, y: initial.focalY });
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const dirty = alt !== media.alt || focal.x !== media.focalX || focal.y !== media.focalY;
  const preview = mediaUrl(media, pickWidth(media, 1280), "webp");
  const position = `${focal.x / 10}% ${focal.y / 10}%`;

  function setFocalFrom(e: React.MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setFocal({
      x: Math.round(((e.clientX - r.left) / r.width) * 1000),
      y: Math.round(((e.clientY - r.top) / r.height) * 1000),
    });
  }

  function nudge(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 100 : 25;
    const d = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }[e.key];
    if (!d) return;
    e.preventDefault();
    setFocal((f) => ({
      x: Math.min(1000, Math.max(0, f.x + d[0])),
      y: Math.min(1000, Math.max(0, f.y + d[1])),
    }));
  }

  const save = () => {
    setNotice(null);
    start(async () => {
      const r = await actions.save({ alt, focalX: focal.x, focalY: focal.y });
      if (!r.ok) return setNotice({ tone: "danger", text: r.message });
      setMedia((m) => ({ ...m, alt: alt.trim(), focalX: focal.x, focalY: focal.y }));
      setNotice({ tone: "success", text: "Saved. Pages that show this image are updated." });
    });
  };

  const replace = (file: File) => {
    setNotice(null);
    start(async () => {
      try {
        const { media: next } = await uploadFile(file, media.id);
        await actions.replaced();
        setMedia(next);
        setNotice({
          tone: "success",
          text: "File replaced everywhere it's used. Check the focal point still fits.",
        });
      } catch (err) {
        setNotice({
          tone: "danger",
          text: err instanceof Error ? err.message : "That didn't upload.",
        });
      }
    });
  };

  return (
    <div className={c.split}>
      <section className={c.panel}>
        <div className={c.panelBody}>
          <p className={c.hint} style={{ marginBottom: 12 }}>
            Click the most important part of the image. When a layout crops it, that spot stays in
            view.
          </p>
          <button
            type="button"
            className={s.focal}
            onClick={setFocalFrom}
            onKeyDown={nudge}
            aria-label={`Focal point: ${Math.round(focal.x / 10)}% from the left, ${Math.round(focal.y / 10)}% from the top. Click to move, or use the arrow keys.`}
            style={{ border: 0, padding: 0, background: "none" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- library preview */}
            <img src={preview} alt="" width={media.width} height={media.height} />
            <span className={s.dot} style={{ left: `${focal.x / 10}%`, top: `${focal.y / 10}%` }} />
          </button>
          <div className={s.crops} aria-label="How crops look">
            {[
              [96, 96, "Square"],
              [160, 72, "Wide"],
              [72, 112, "Tall"],
            ].map(([w, h, label]) => (
              // eslint-disable-next-line @next/next/no-img-element -- crop preview
              <img
                key={label}
                src={preview}
                alt=""
                width={w}
                height={h}
                title={`${label} crop`}
                style={{ objectPosition: position }}
              />
            ))}
          </div>
        </div>
      </section>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <section className={c.panel}>
          <div className={c.panelBody}>
            {notice && (
              <div
                className={`${c.alert} ${c[notice.tone]}`}
                role={notice.tone === "danger" ? "alert" : "status"}
              >
                <p className={c.alertTitle}>{notice.text}</p>
              </div>
            )}
            <div className={c.field}>
              <label htmlFor="alt" className={c.label}>
                Alt text
              </label>
              <textarea
                id="alt"
                rows={3}
                maxLength={300}
                className={c.input}
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                aria-describedby="alt-hint"
              />
              <p id="alt-hint" className={c.hint}>
                Describe what the image shows, for people who can&apos;t see it, in a sentence.
                Required before the image can go live on a page.
              </p>
            </div>
            <div className={c.actions}>
              <Button variant="primary" onClick={save} disabled={pending || !dirty}>
                Save changes
              </Button>
              {!media.alt.trim() && <Badge tone="warning">Needs alt text</Badge>}
            </div>
          </div>
        </section>

        <section className={c.panel}>
          <div className={c.panelBody}>
            <dl className={c.dl}>
              <dt>File</dt>
              <dd>{media.filename}</dd>
              <dt>Size</dt>
              <dd>
                {media.width} × {media.height} px · {formatBytes(media.bytes)}
              </dd>
              <dt>Used on</dt>
              <dd>
                {usage.length === 0
                  ? "No pages yet"
                  : usage.map((u, i) => (
                      <span key={u.id}>
                        {i > 0 && ", "}
                        <a href={u.href}>{u.title}</a>
                        {!u.live && " (draft)"}
                      </span>
                    ))}
              </dd>
            </dl>
            <div className={c.actions} style={{ marginTop: 16 }}>
              <Button onClick={() => fileInput.current?.click()} disabled={pending}>
                <IconRefresh size={18} stroke={2} aria-hidden />
                Replace file
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPT}
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) replace(f);
                  e.target.value = "";
                }}
              />
              {confirmDelete ? (
                <span
                  role="alertdialog"
                  aria-label="Delete this image?"
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <span className={c.meta}>Delete for good?</span>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        setConfirmDelete(false);
                        const r = await actions.remove();
                        if (r && !r.ok) setNotice({ tone: "danger", text: r.message });
                      })
                    }
                  >
                    Delete image
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </span>
              ) : (
                <Button variant="ghost" onClick={() => setConfirmDelete(true)} disabled={pending}>
                  <IconTrash size={18} stroke={2} aria-hidden />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
