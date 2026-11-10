"use client";

import { IconArrowDown, IconArrowUp, IconExternalLink, IconPlus, IconX } from "@tabler/icons-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Badge, Button, buttonClass, controls as c } from "../ui/client";
import type { Issue } from "../content/types";
import s from "./menus.module.css";
import { menusSchema, type MenuLink, type Menus } from "./schema";

export type SaveMenusResult = { ok: true } | { ok: false; message: string; issues?: Issue[] };

export interface MenusEditorProps {
  initial: Menus;
  /** True until the menus are saved for the first time (the site shows its built-in ones). */
  builtIn: boolean;
  /** Addresses to suggest in link fields: published pages and sections. */
  suggestions: { label: string; href: string }[];
  /** The email address the footer can show. */
  email: string;
  viewSiteHref: string;
  save: (menus: Menus) => Promise<SaveMenusResult>;
}

const emptyLink = (): MenuLink => ({ label: "", href: "" });
const key = (path: (string | number)[]) => path.join(".");

/** Menus and footer (PLAN D28): edit the links, see a sketch, save to publish. */
export function MenusEditor(props: MenusEditorProps) {
  const [menus, setMenusState] = useState(props.initial);
  const [saved, setSaved] = useState(() => JSON.stringify(props.initial));
  const [issues, setIssues] = useState<Issue[]>([]);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [builtIn, setBuiltIn] = useState(props.builtIn);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(menus) !== saved;
  // Any edit clears old messages: they're matched by position, and edits can
  // move links around. Saving checks everything again.
  const setMenus: typeof setMenusState = (next) => {
    setIssues([]);
    setMenusState(next);
  };
  const errors = useMemo(() => new Map(issues.map((i) => [key(i.path), i.message])), [issues]);

  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  function save() {
    setNotice(null);
    const check = menusSchema.safeParse(menus);
    if (!check.success) {
      setIssues(
        check.error.issues.map((i) => ({
          path: i.path as (string | number)[],
          message: i.message,
        })),
      );
      setNotice({ tone: "danger", text: "Some links need attention before saving." });
      return;
    }
    start(async () => {
      const r = await props.save(check.data);
      if (!r.ok) {
        setIssues(r.issues ?? []);
        setNotice({ tone: "danger", text: r.message });
        return;
      }
      setIssues([]);
      setMenus(check.data);
      setSaved(JSON.stringify(check.data));
      setBuiltIn(false);
      setNotice({ tone: "success", text: "Saved. The menus are live on every page." });
    });
  }

  const listEditor = (name: "main" | "footer", max: number, addLabel: string) => {
    const list = menus[name];
    const update = (next: MenuLink[]) => setMenus((m) => ({ ...m, [name]: next }));
    return (
      <>
        {list.length > 0 && (
          <div className={s.headings} aria-hidden>
            <span className={c.label}>Label</span>
            <span className={c.label}>Goes to</span>
          </div>
        )}
        <ol className={s.rows}>
          {list.map((link, i) => (
            <li key={i}>
              <div className={s.row}>
                <LinkInputs
                  link={link}
                  path={[name, i]}
                  errors={errors}
                  onChange={(l) => update(list.map((x, j) => (j === i ? l : x)))}
                />
                <div className={s.rowTools}>
                  <button
                    type="button"
                    className={s.icon}
                    aria-label={`Move ${link.label || "link"} up`}
                    disabled={i === 0}
                    onClick={() => update(swap(list, i, i - 1))}
                  >
                    <IconArrowUp size={16} stroke={2} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={s.icon}
                    aria-label={`Move ${link.label || "link"} down`}
                    disabled={i === list.length - 1}
                    onClick={() => update(swap(list, i, i + 1))}
                  >
                    <IconArrowDown size={16} stroke={2} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={s.icon}
                    aria-label={`Remove ${link.label || "link"}`}
                    onClick={() => update(list.filter((_, j) => j !== i))}
                  >
                    <IconX size={16} stroke={2} aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
        {errors.get(name) && <p className={c.error}>{errors.get(name)}</p>}
        {list.length < max ? (
          <Button size="sm" onClick={() => update([...list, emptyLink()])}>
            <IconPlus size={16} stroke={2} aria-hidden />
            {addLabel}
          </Button>
        ) : (
          <p className={c.hint}>That&apos;s the most this space holds ({max}).</p>
        )}
      </>
    );
  };

  return (
    <>
      <datalist id="menu-suggestions">
        {props.suggestions.map((sug) => (
          <option key={sug.href} value={sug.href}>
            {sug.label}
          </option>
        ))}
      </datalist>

      <div
        className={c.actions}
        style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}
      >
        <div className={c.actions} style={{ alignItems: "center" }}>
          {builtIn ? <Badge>Built-in menus</Badge> : <Badge tone="success">Live</Badge>}
          <span className={c.meta} role="status">
            {pending ? "Saving…" : dirty ? "Unsaved changes" : "All changes saved"}
          </span>
        </div>
        <div className={c.actions}>
          <a
            href={props.viewSiteHref}
            target="_blank"
            rel="noreferrer"
            className={buttonClass("ghost")}
          >
            <IconExternalLink size={18} stroke={2} aria-hidden />
            View site
          </a>
          <Button variant="primary" onClick={save} disabled={pending || !dirty}>
            Save and publish
          </Button>
        </div>
      </div>

      {notice && (
        <div
          className={`${c.alert} ${c[notice.tone]}`}
          role={notice.tone === "danger" ? "alert" : "status"}
        >
          <p className={c.alertTitle}>{notice.text}</p>
        </div>
      )}

      <div className={s.layout}>
        <div className={s.stack}>
          <section className={c.panel}>
            <div className={c.panelHead}>
              <h2 className={c.panelTitle}>Top menu</h2>
            </div>
            <div className={c.panelBody}>{listEditor("main", 5, "Add a link")}</div>
          </section>

          <section className={c.panel}>
            <div className={c.panelHead}>
              <h2 className={c.panelTitle}>Menu button</h2>
            </div>
            <div className={c.panelBody}>
              <label className={s.check}>
                <input
                  type="checkbox"
                  checked={menus.button !== null}
                  onChange={(e) =>
                    setMenus((m) => ({
                      ...m,
                      button: e.target.checked ? (m.button ?? emptyLink()) : null,
                    }))
                  }
                />
                Show a highlighted button at the end of the menu
              </label>
              {menus.button && (
                <div
                  className={s.row}
                  style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)" }}
                >
                  <LinkInputs
                    link={menus.button}
                    path={["button"]}
                    errors={errors}
                    onChange={(l) => setMenus((m) => ({ ...m, button: l }))}
                    withLabels
                  />
                </div>
              )}
            </div>
          </section>

          <section className={c.panel}>
            <div className={c.panelHead}>
              <h2 className={c.panelTitle}>Footer</h2>
            </div>
            <div className={c.panelBody}>
              {listEditor("footer", 8, "Add a footer link")}
              <label className={s.check} style={{ marginTop: 16, marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={menus.showEmail}
                  onChange={(e) => setMenus((m) => ({ ...m, showEmail: e.target.checked }))}
                />
                Show {props.email} in the footer
              </label>
            </div>
          </section>
          <p className={c.hint}>
            Links can go to a page (/contact), a section of a page (/#contact), another website
            (https://…) or an email (mailto:…). Links to other websites open in a new tab.
          </p>
        </div>

        <aside className={s.sketch} aria-label="How it looks">
          <span className={c.label}>How it looks</span>
          <div className={s.bar}>
            <span className={s.mark}>1880.</span>
            {menus.main.map((l, i) => (
              <span key={i}>{l.label || "…"}</span>
            ))}
            {menus.button && <span className={s.barCta}>{menus.button.label || "…"}</span>}
          </div>
          <div className={s.foot}>
            <span className={s.mark}>1880.</span>
            {menus.footer.map((l, i) => (
              <span key={i} className={s.footLink}>
                {l.label || "…"}
              </span>
            ))}
            {menus.showEmail && <span className={s.muted}>{props.email}</span>}
          </div>
          <p className={c.hint}>
            A sketch: the site uses its own fonts and spacing. On phones, the menu opens from a
            button.
          </p>
        </aside>
      </div>
    </>
  );
}

function LinkInputs({
  link,
  path,
  errors,
  onChange,
  withLabels,
}: {
  link: MenuLink;
  path: (string | number)[];
  errors: Map<string, string>;
  onChange: (l: MenuLink) => void;
  withLabels?: boolean;
}) {
  const id = path.join("-");
  const labelErr = errors.get(key([...path, "label"]));
  const hrefErr = errors.get(key([...path, "href"]));
  return (
    <>
      <div>
        {withLabels && (
          <label htmlFor={`${id}-label`} className={c.label}>
            Label
          </label>
        )}
        <input
          id={`${id}-label`}
          className={c.input}
          value={link.label}
          maxLength={40}
          aria-label={withLabels ? undefined : "Label"}
          aria-invalid={labelErr ? true : undefined}
          onChange={(e) => onChange({ ...link, label: e.target.value })}
        />
        {labelErr && <p className={c.error}>{labelErr}</p>}
      </div>
      <div>
        {withLabels && (
          <label htmlFor={`${id}-href`} className={c.label}>
            Goes to
          </label>
        )}
        <input
          id={`${id}-href`}
          className={c.input}
          value={link.href}
          list="menu-suggestions"
          placeholder="/contact"
          maxLength={300}
          aria-label={withLabels ? undefined : `Where ${link.label || "this link"} goes`}
          aria-invalid={hrefErr ? true : undefined}
          onChange={(e) => onChange({ ...link, href: e.target.value.trim() })}
        />
        {hrefErr && <p className={c.error}>{hrefErr}</p>}
      </div>
    </>
  );
}

function swap<T>(list: T[], a: number, b: number): T[] {
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}
