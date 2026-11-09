"use client";

import {
  IconArrowDown,
  IconArrowUp,
  IconChevronDown,
  IconChevronRight,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconHistory,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { EntryDoc, Issue, StoredBlock } from "../content/types";
import { Badge, Button, buttonClass, controls as c } from "../ui/client";
import {
  blockSummary,
  issueMap,
  newBlock,
  pathKey,
  setAt,
  tidyDoc,
  type BlockType,
  type Path,
} from "./doc";
import { FieldInput } from "./FieldInput";
import { PREVIEW_DOC, PREVIEW_READY } from "./protocol";
import s from "./editor.module.css";

export type ActionResult =
  { ok: true } | { ok: false; message: string; issues?: Issue[]; conflict?: boolean };
export type SaveResult = { ok: true; versionId: string } | Exclude<ActionResult, { ok: true }>;
export type DiscardResult =
  | { ok: true; doc: EntryDoc; slug: string; versionId: string }
  | Exclude<ActionResult, { ok: true }>;

export interface PageEditorProps {
  initial: { doc: EntryDoc; slug: string; versionId: string | null };
  status: { published: boolean; hasChanges: boolean; isHome: boolean };
  blockTypes: BlockType[];
  /** Shown before the address field, e.g. "1880.io/". */
  addressPrefix: string;
  /** Public path before the slug, e.g. "/" so "about" lives at /about. */
  basePath: string;
  previewUrl: string;
  historyUrl: string;
  backUrl: string;
  actions: {
    save: (input: {
      doc: EntryDoc;
      slug: string;
      baseVersionId: string | null;
    }) => Promise<SaveResult>;
    publish: () => Promise<ActionResult>;
    discard: () => Promise<DiscardResult>;
    unpublish: () => Promise<ActionResult>;
    remove: () => Promise<ActionResult>;
  };
}

type Notice = { tone: "success" | "danger" | "warning"; text: string } | null;

export function PageEditor(props: PageEditorProps) {
  const { blockTypes, actions } = props;
  const [doc, setDoc] = useState(props.initial.doc);
  const [slug, setSlug] = useState(props.initial.slug);
  const [versionId, setVersionId] = useState(props.initial.versionId);
  const [saved, setSaved] = useState(() =>
    JSON.stringify({ doc: props.initial.doc, slug: props.initial.slug }),
  );
  const [status, setStatus] = useState(props.status);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [confirming, setConfirming] = useState<null | "delete" | "unpublish" | "discard">(null);
  const [pending, startTransition] = useTransition();
  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  // Desktop preview renders at a real desktop width and is scaled to fit the column.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setStageSize({ width: e.contentRect.width, height: e.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const DESKTOP = 1280;
  const scale =
    device === "desktop" && stageSize.width > 0 ? Math.min(1, stageSize.width / DESKTOP) : 1;

  const dirty = JSON.stringify({ doc, slug }) !== saved;
  const errors = useMemo(() => issueMap(issues), [issues]);
  const typeOf = (t: string) => blockTypes.find((b) => b.type === t);

  // ---- Live preview ----
  const sendPreview = useCallback(() => {
    frame.current?.contentWindow?.postMessage(
      { type: PREVIEW_DOC, doc: tidyDoc(doc, blockTypes) },
      window.location.origin,
    );
  }, [doc, blockTypes]);

  useEffect(() => {
    const t = setTimeout(sendPreview, 120);
    return () => clearTimeout(t);
  }, [sendPreview]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (
        e.origin === window.location.origin &&
        e.source === frame.current?.contentWindow &&
        e.data?.type === PREVIEW_READY
      ) {
        sendPreview();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [sendPreview]);

  // ---- Saving ----
  const save = useCallback(async (): Promise<boolean> => {
    const clean = tidyDoc(doc, blockTypes);
    const result = await actions.save({ doc: clean, slug, baseVersionId: versionId });
    if (!result.ok) {
      setIssues(result.issues ?? []);
      setNotice({ tone: result.conflict ? "warning" : "danger", text: result.message });
      return false;
    }
    setVersionId(result.versionId);
    setSaved(JSON.stringify({ doc, slug }));
    setStatus((st) => ({ ...st, hasChanges: st.published }));
    return true;
  }, [actions, blockTypes, doc, slug, versionId]);

  // Old messages go the moment a new action starts (outside the transition,
  // which would otherwise hold the update until the action finishes).
  const onSave = () => {
    setNotice(null);
    startTransition(async () => {
      if (await save()) {
        setIssues([]);
        setNotice({ tone: "success", text: "Draft saved." });
      }
    });
  };

  const onPublish = () => {
    setNotice(null);
    startTransition(async () => {
      if (dirty && !(await save())) return;
      const result = await actions.publish();
      if (!result.ok) {
        setIssues(result.issues ?? []);
        // Open the sections that need attention.
        const ids = (result.issues ?? []).flatMap((i) =>
          i.path[0] === "blocks" ? [doc.blocks[i.path[1] as number]?.id] : [],
        );
        setOpen((o) => new Set([...o, ...ids.filter(Boolean)]));
        setNotice({ tone: "danger", text: result.message });
        return;
      }
      setIssues([]);
      setStatus((st) => ({ ...st, published: true, hasChanges: false }));
      setNotice({ tone: "success", text: "Published. The page is live." });
    });
  };

  const runConfirmed = (kind: NonNullable<typeof confirming>) => {
    setConfirming(null);
    setNotice(null);
    startTransition(async () => {
      if (kind === "discard") {
        const r = await actions.discard();
        if (!r.ok) return setNotice({ tone: "danger", text: r.message });
        setDoc(r.doc);
        setSlug(r.slug);
        setVersionId(r.versionId);
        setSaved(JSON.stringify({ doc: r.doc, slug: r.slug }));
        setIssues([]);
        setStatus((st) => ({ ...st, hasChanges: false }));
        setNotice({
          tone: "success",
          text: "Changes discarded. The draft matches the live page again.",
        });
      } else if (kind === "unpublish") {
        const r = await actions.unpublish();
        if (!r.ok) return setNotice({ tone: "danger", text: r.message });
        setStatus((st) => ({ ...st, published: false, hasChanges: false }));
        setNotice({
          tone: "success",
          text: "Unpublished. The page is no longer on the site; the draft is kept.",
        });
      } else {
        const r = await actions.remove();
        if (r && !r.ok) setNotice({ tone: "danger", text: r.message });
      }
    });
  };

  // Ctrl/Cmd+S saves; leaving with unsaved changes asks first.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!pending) onSave();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  });

  // ---- Editing ----
  const change = (path: Path, value: unknown) => setDoc((d) => setAt(d, path, value));
  const updateBlocks = (fn: (blocks: StoredBlock[]) => StoredBlock[]) => {
    setDoc((d) => ({ ...d, blocks: fn(d.blocks) }));
    setIssues([]); // positions changed: old messages no longer line up
  };
  const move = (i: number, by: number) =>
    updateBlocks((bs) => {
      const next = [...bs];
      const [b] = next.splice(i, 1);
      next.splice(i + by, 0, b);
      return next;
    });
  const toggle = (id: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const add = (t: BlockType) => {
    const b = newBlock(t);
    updateBlocks((bs) => [...bs, b]);
    setOpen((o) => new Set([...o, b.id]));
    requestAnimationFrame(() =>
      document
        .getElementById(`block-${b.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const statusBadge = !status.published ? (
    <Badge>Draft</Badge>
  ) : status.hasChanges || dirty ? (
    <Badge tone="warning">Live, with unpublished changes</Badge>
  ) : (
    <Badge tone="success">Live</Badge>
  );
  const livePath = props.basePath + slug;

  return (
    <div className={s.editor}>
      <div className={s.toolbar}>
        <div className={s.titleArea}>
          <Link href={props.backUrl} className={s.back}>
            Pages
          </Link>
          <h1 className={s.title}>{doc.title.trim() || "Untitled page"}</h1>
          <div className={s.meta}>
            {statusBadge}
            <span className={c.meta} role="status">
              {pending ? "Working…" : dirty ? "Unsaved changes" : "All changes saved"}
            </span>
          </div>
        </div>
        <div className={c.actions}>
          <Link href={props.historyUrl} className={buttonClass("ghost")}>
            <IconHistory size={18} stroke={2} aria-hidden />
            History
          </Link>
          {status.published && (
            <a href={livePath} target="_blank" rel="noreferrer" className={buttonClass("ghost")}>
              <IconExternalLink size={18} stroke={2} aria-hidden />
              View live
            </a>
          )}
          <Button onClick={onSave} disabled={pending || !dirty}>
            Save draft
          </Button>
          <Button
            variant="primary"
            onClick={onPublish}
            disabled={pending || (status.published && !status.hasChanges && !dirty)}
          >
            {status.published ? "Publish changes" : "Publish"}
          </Button>
        </div>
      </div>

      {notice && (
        <div
          className={`${c.alert} ${c[notice.tone]}`}
          role={notice.tone === "danger" ? "alert" : "status"}
        >
          <div>
            <p className={c.alertTitle}>{notice.text}</p>
            {issues.length > 0 && (
              <ul className={s.issues}>
                {issues.slice(0, 6).map((i) => (
                  <li key={pathKey(i.path)}>
                    {describePath(i.path, doc, blockTypes)}: {i.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className={s.columns}>
        <div className={s.form}>
          <section className={c.panel}>
            <div className={c.panelBody}>
              <div className={c.field}>
                <label htmlFor="page-title" className={c.label}>
                  Title
                </label>
                <input
                  id="page-title"
                  className={c.input}
                  value={doc.title}
                  maxLength={200}
                  aria-invalid={errors.has("title") || undefined}
                  onChange={(e) => change(["title"], e.target.value)}
                />
                {errors.get("title") && <p className={c.error}>{errors.get("title")}</p>}
              </div>
              <div className={c.field}>
                <label htmlFor="page-slug" className={c.label}>
                  Address
                </label>
                {status.isHome ? (
                  <p className={c.hint}>
                    This is the home page, at {props.addressPrefix.replace(/\/$/, "")}.
                  </p>
                ) : (
                  <div className={s.address}>
                    <span className={s.prefix}>{props.addressPrefix}</span>
                    <input
                      id="page-slug"
                      className={c.input}
                      value={slug}
                      maxLength={80}
                      aria-invalid={errors.has("slug") || undefined}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                    />
                  </div>
                )}
                {errors.get("slug") && <p className={c.error}>{errors.get("slug")}</p>}
                {status.published && !status.isHome && slug !== props.initial.slug && (
                  <p className={c.hint}>
                    When you publish, the old address will forward here automatically.
                  </p>
                )}
              </div>
              <details className={s.seo}>
                <summary>Search engines and sharing</summary>
                <div className={c.field}>
                  <label htmlFor="seo-title" className={c.label}>
                    Search title <span className={s.optional}>Optional</span>
                  </label>
                  <input
                    id="seo-title"
                    className={c.input}
                    value={doc.seo.title ?? ""}
                    maxLength={120}
                    placeholder={doc.title}
                    onChange={(e) => change(["seo", "title"], e.target.value)}
                  />
                  <p className={c.hint}>
                    Shown in Google and when the page is shared. Around 60 characters reads best.
                  </p>
                </div>
                <div className={c.field}>
                  <label htmlFor="seo-description" className={c.label}>
                    Description <span className={s.optional}>Optional</span>
                  </label>
                  <textarea
                    id="seo-description"
                    rows={3}
                    className={c.input}
                    value={doc.seo.description ?? ""}
                    maxLength={200}
                    onChange={(e) => change(["seo", "description"], e.target.value)}
                  />
                </div>
              </details>
            </div>
          </section>

          <h2 className={s.sectionsTitle}>Sections</h2>
          {errors.get("blocks") && <p className={c.error}>{errors.get("blocks")}</p>}
          <ol className={s.blocks}>
            {doc.blocks.map((block, i) => {
              const t = typeOf(block.type);
              const isOpen = open.has(block.id);
              const hasError = [...errors.keys()].some((k) => k.startsWith(`blocks.${i}.`));
              return (
                <li
                  key={block.id}
                  id={`block-${block.id}`}
                  className={`${s.block} ${block.hidden ? s.hidden : ""} ${hasError ? s.blockError : ""}`}
                >
                  <div className={s.blockHead}>
                    <button
                      type="button"
                      className={s.blockToggle}
                      aria-expanded={isOpen}
                      onClick={() => toggle(block.id)}
                    >
                      {isOpen ? (
                        <IconChevronDown size={18} stroke={2} aria-hidden />
                      ) : (
                        <IconChevronRight size={18} stroke={2} aria-hidden />
                      )}
                      <span className={s.blockLabel}>{t?.label ?? block.type}</span>
                      {block.hidden && <Badge>Hidden</Badge>}
                      {hasError && <Badge tone="danger">Needs attention</Badge>}
                      <span className={s.summary}>{blockSummary(block, t)}</span>
                    </button>
                    <div className={s.blockTools}>
                      <button
                        type="button"
                        className={s.iconButton}
                        aria-label="Move up"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                      >
                        <IconArrowUp size={16} stroke={2} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={s.iconButton}
                        aria-label="Move down"
                        disabled={i === doc.blocks.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        <IconArrowDown size={16} stroke={2} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={s.iconButton}
                        aria-label={block.hidden ? "Show on the page" : "Hide from the page"}
                        title={block.hidden ? "Show on the page" : "Hide from the page"}
                        onClick={() =>
                          change(["blocks", i, "hidden"], block.hidden ? undefined : true)
                        }
                      >
                        {block.hidden ? (
                          <IconEyeOff size={16} stroke={2} aria-hidden />
                        ) : (
                          <IconEye size={16} stroke={2} aria-hidden />
                        )}
                      </button>
                      <button
                        type="button"
                        className={s.iconButton}
                        aria-label="Remove section"
                        onClick={() => updateBlocks((bs) => bs.filter((b) => b.id !== block.id))}
                      >
                        <IconTrash size={16} stroke={2} aria-hidden />
                      </button>
                    </div>
                  </div>
                  {isOpen && (
                    <div className={s.blockBody}>
                      {t ? (
                        t.fields.map((f) => (
                          <FieldInput
                            key={f.key}
                            field={f}
                            value={block[f.key]}
                            path={["blocks", i, f.key]}
                            errors={errors}
                            onChange={change}
                          />
                        ))
                      ) : (
                        <p className={c.hint}>
                          This kind of section no longer exists. Remove it, or ask a developer.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <section className={s.addPanel} aria-labelledby="add-title">
            <h3 id="add-title" className={c.label}>
              Add a section
            </h3>
            <div className={s.addGrid}>
              {blockTypes.map((t) => (
                <button key={t.type} type="button" className={s.addButton} onClick={() => add(t)}>
                  <span className={s.addLabel}>
                    <IconPlus size={16} stroke={2} aria-hidden />
                    {t.label}
                  </span>
                  {t.description && <span className={c.meta}>{t.description}</span>}
                </button>
              ))}
            </div>
          </section>

          <section className={s.danger}>
            {confirming ? (
              <div className={s.confirm} role="alertdialog" aria-labelledby="confirm-text">
                <p id="confirm-text">
                  {confirming === "delete"
                    ? "Delete this page and its history? This can't be undone."
                    : confirming === "unpublish"
                      ? "Take this page off the site? The draft is kept."
                      : "Throw away every change since the last publish?"}
                </p>
                <div className={c.actions}>
                  <Button onClick={() => runConfirmed(confirming)} disabled={pending}>
                    {confirming === "delete"
                      ? "Delete page"
                      : confirming === "unpublish"
                        ? "Unpublish"
                        : "Discard changes"}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirming(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className={c.actions}>
                {status.published && (status.hasChanges || dirty) && (
                  <Button variant="ghost" size="sm" onClick={() => setConfirming("discard")}>
                    Discard unpublished changes
                  </Button>
                )}
                {status.published && !status.isHome && (
                  <Button variant="ghost" size="sm" onClick={() => setConfirming("unpublish")}>
                    Unpublish
                  </Button>
                )}
                {!status.isHome && (
                  <Button variant="ghost" size="sm" onClick={() => setConfirming("delete")}>
                    Delete page
                  </Button>
                )}
              </div>
            )}
          </section>
        </div>

        <div className={s.previewColumn}>
          <div className={s.previewBar}>
            <span className={c.meta}>
              Preview{dirty ? " (includes unsaved changes)" : ""}
              {device === "desktop" && scale < 1 ? ` · ${Math.round(scale * 100)}%` : ""}
            </span>
            <div
              className={c.segments}
              role="group"
              aria-label="Preview size"
              style={{ marginBottom: 0 }}
            >
              <button
                type="button"
                className={c.segment}
                aria-pressed={device === "desktop"}
                aria-current={device === "desktop" ? "page" : undefined}
                onClick={() => setDevice("desktop")}
              >
                <IconDeviceDesktop size={16} stroke={2} aria-hidden />
                Desktop
              </button>
              <button
                type="button"
                className={c.segment}
                aria-pressed={device === "phone"}
                aria-current={device === "phone" ? "page" : undefined}
                onClick={() => setDevice("phone")}
              >
                <IconDeviceMobile size={16} stroke={2} aria-hidden />
                Phone
              </button>
            </div>
          </div>
          <div className={s.previewStage} ref={stage}>
            <iframe
              ref={frame}
              src={props.previewUrl}
              title="Live preview"
              className={`${s.preview} ${device === "phone" ? s.phone : ""}`}
              style={
                device === "desktop" && scale < 1
                  ? {
                      width: DESKTOP,
                      height: stageSize.height / scale,
                      transform: `scale(${scale})`,
                      transformOrigin: "top left",
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** "Hero › Headline" for an issue path, so the summary says where to look. */
function describePath(path: Path, doc: EntryDoc, types: BlockType[]): string {
  if (path[0] === "title") return "Title";
  if (path[0] === "slug") return "Address";
  if (path[0] !== "blocks") return "Page";
  const block = doc.blocks[path[1] as number];
  const t = types.find((x) => x.type === block?.type);
  if (path.length === 1) return "Sections";
  const field = t?.fields.find((f) => f.key === path[2]);
  return [`Section ${(path[1] as number) + 1} (${t?.label ?? "?"})`, field?.label]
    .filter(Boolean)
    .join(" › ");
}
