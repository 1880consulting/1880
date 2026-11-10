"use client";

import { IconPhoto, IconX } from "@tabler/icons-react";
import { useActionState, useState } from "react";
import { slugify } from "@/cms/content/types";
import { MediaPicker } from "@/cms/media/MediaPicker";
import { mediaUrl, pickWidth, type MediaInfo } from "@/cms/media/types";
import mediaStyles from "@/cms/media/media.module.css";
import { Button, controls as c } from "@/cms/ui/client";
import type { ClientFormState } from "./actions";

export interface ClientValues {
  name: string;
  slug: string;
  accentColor: string | null;
  logo: MediaInfo | null;
}

/** Name, URL name, logo and accent color: for a new client, or to edit one. */
export function ClientForm({
  initial,
  portalOrigin,
  action,
  listMedia,
  submitLabel,
}: {
  initial?: ClientValues;
  portalOrigin: string;
  action: (prev: ClientFormState, form: FormData) => Promise<ClientFormState>;
  listMedia: () => Promise<MediaInfo[]>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [useAccent, setUseAccent] = useState(!!initial?.accentColor);
  const [accent, setAccent] = useState(initial?.accentColor ?? "#1f6feb");
  const [logo, setLogo] = useState<MediaInfo | null>(initial?.logo ?? null);
  const [picking, setPicking] = useState(false);
  const err = (field: ClientFormState["field"]) =>
    state.status === "error" && state.field === field ? state.message : undefined;
  const general = state.status === "error" && !state.field ? state.message : undefined;

  return (
    <form action={formAction}>
      {state.status === "saved" && (
        <p className={c.meta} role="status" style={{ marginBottom: 16 }}>
          Saved.
        </p>
      )}
      {general && (
        <p className={c.error} role="alert" style={{ marginBottom: 16 }}>
          {general}
        </p>
      )}
      <div className={c.field}>
        <label htmlFor="client-name" className={c.label}>
          Client name
        </label>
        <input
          id="client-name"
          name="name"
          className={c.input}
          required
          maxLength={200}
          value={name}
          aria-invalid={err("name") ? true : undefined}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value).slice(0, 63));
          }}
        />
        {err("name") && <p className={c.error}>{err("name")}</p>}
      </div>
      <div className={c.field}>
        <label htmlFor="client-slug" className={c.label}>
          URL name
        </label>
        <input
          id="client-slug"
          name="slug"
          className={c.input}
          required
          maxLength={63}
          value={slug}
          aria-invalid={err("slug") ? true : undefined}
          aria-describedby="client-slug-help"
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value.toLowerCase());
          }}
        />
        <p id="client-slug-help" className={c.hint}>
          Their address: {portalOrigin.replace(/^https?:\/\//, "")}/{slug || "…"}.{" "}
          {initial
            ? "Changing it breaks links people saved; emailed links still work."
            : "Use a code name if the client must stay discreet."}
        </p>
        {err("slug") && <p className={c.error}>{err("slug")}</p>}
      </div>

      <div className={c.field}>
        <span className={c.label} id="client-logo-label">
          Logo <span className={c.meta}>Optional. Shown only after sign-in</span>
        </span>
        <input type="hidden" name="logoMediaId" value={logo?.id ?? ""} />
        <div className={mediaStyles.field} role="group" aria-labelledby="client-logo-label">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- library thumbnail
            <img
              className={mediaStyles.fieldThumb}
              src={mediaUrl(logo, pickWidth(logo, 160), "webp")}
              alt=""
              style={{ objectFit: "contain" }}
            />
          ) : (
            <span
              className={mediaStyles.fieldThumb}
              style={{ display: "grid", placeItems: "center" }}
            >
              <IconPhoto size={20} stroke={2} aria-hidden />
            </span>
          )}
          <span className={mediaStyles.fieldInfo}>
            <span className={c.meta}>{logo ? logo.filename : "No logo"}</span>
          </span>
          <Button size="sm" onClick={() => setPicking(true)}>
            {logo ? "Change" : "Choose logo"}
          </Button>
          {logo && (
            <Button
              size="sm"
              variant="ghost"
              aria-label="Remove logo"
              onClick={() => setLogo(null)}
            >
              <IconX size={16} stroke={2} aria-hidden />
            </Button>
          )}
        </div>
        <MediaPicker
          open={picking}
          onClose={() => setPicking(false)}
          onPick={(m) => {
            setLogo(m);
            setPicking(false);
          }}
          load={listMedia}
          selectedId={logo?.id}
        />
      </div>

      <div className={c.field}>
        <label className={c.label} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            name="useAccent"
            checked={useAccent}
            onChange={(e) => setUseAccent(e.target.checked)}
          />
          Accent color
        </label>
        {useAccent && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="color"
              aria-label="Accent color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              style={{ width: 48, height: 36, padding: 0, border: 0, background: "none" }}
            />
            <input
              name="accentColor"
              className={c.input}
              style={{ maxWidth: 140 }}
              value={accent}
              aria-label="Accent color as hex"
              aria-invalid={err("accentColor") ? true : undefined}
              onChange={(e) => setAccent(e.target.value)}
            />
          </div>
        )}
        <p className={c.hint}>A thin line under the portal header, in the client&apos;s color.</p>
        {err("accentColor") && <p className={c.error}>{err("accentColor")}</p>}
      </div>

      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
