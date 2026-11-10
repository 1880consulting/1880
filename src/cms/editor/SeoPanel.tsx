"use client";

import type { EntryDoc } from "../content/types";
import { mediaUrl, pickWidth } from "../media/types";
import { controls as c } from "../ui/client";
import type { Path } from "./doc";
import { FieldInput } from "./FieldInput";
import { useMediaField } from "./mediaField";
import s from "./editor.module.css";

/** Lengths search engines show before cutting text off. */
const TITLE_FITS = 60;
const DESCRIPTION_FITS = 160;

/**
 * Search engines and sharing (PLAN §3.2 point 8): title, description, share
 * image, "hide from search", and previews of how Google and social sites show it.
 */
export function SeoPanel({
  doc,
  isHome,
  site,
  path,
  fallbackDescription,
  fallbackImage,
  errors,
  change,
}: {
  doc: EntryDoc;
  isHome: boolean;
  site: { name: string; host: string };
  /** The page's public path, e.g. "/work/recompete". */
  path: string;
  /** Used when no description is set (e.g. a case study's summary). */
  fallbackDescription?: string;
  /** Used when no share image is set (e.g. a cover). */
  fallbackImage?: string;
  errors: Map<string, string>;
  change: (path: Path, value: unknown) => void;
}) {
  const { media } = useMediaField();
  const seo = doc.seo ?? {};
  const baseTitle = seo.title?.trim() || doc.title.trim() || "Untitled";
  const shownTitle = isHome && seo.title?.trim() ? baseTitle : `${baseTitle} | ${site.name}`;
  const description = seo.description?.trim() || fallbackDescription?.trim() || "";
  const imageId = seo.image || fallbackImage;
  const image = imageId ? media[imageId] : undefined;
  const url = `${site.host}${path === "/" ? "" : path}`;

  const counter = (len: number, fits: number) => (
    <span
      className={s.count}
      aria-hidden
      style={len > fits ? { color: "var(--os-warning-text)" } : undefined}
    >
      {len}/{fits}
    </span>
  );

  return (
    <details className={s.seo}>
      <summary>Search engines and sharing</summary>
      <div className={c.field}>
        <div className={s.labelRow}>
          <label htmlFor="seo-title" className={c.label}>
            Search title <span className={s.optional}>Optional</span>
          </label>
          {counter(baseTitle.length, TITLE_FITS)}
        </div>
        <input
          id="seo-title"
          className={c.input}
          value={seo.title ?? ""}
          maxLength={120}
          placeholder={doc.title}
          onChange={(e) => change(["seo", "title"], e.target.value)}
        />
        <p className={c.hint}>
          Leave blank to use the title. Google shows about {TITLE_FITS} characters.
        </p>
      </div>
      <div className={c.field}>
        <div className={s.labelRow}>
          <label htmlFor="seo-description" className={c.label}>
            Description <span className={s.optional}>Optional</span>
          </label>
          {counter(description.length, DESCRIPTION_FITS)}
        </div>
        <textarea
          id="seo-description"
          rows={3}
          className={c.input}
          value={seo.description ?? ""}
          maxLength={200}
          placeholder={fallbackDescription}
          onChange={(e) => change(["seo", "description"], e.target.value)}
        />
        <p className={c.hint}>
          A sentence or two that makes people want to click. Google shows about {DESCRIPTION_FITS}{" "}
          characters.
        </p>
      </div>
      <FieldInput
        field={{
          kind: "image",
          key: "image",
          label: "Share image",
          required: false,
          help: fallbackImage
            ? "Leave blank to use the cover image."
            : "Shown when the page is shared on LinkedIn and elsewhere.",
        }}
        value={seo.image}
        path={["seo", "image"]}
        errors={errors}
        onChange={change}
      />
      <label className={s.check} style={{ marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={seo.noindex === true}
          onChange={(e) => change(["seo", "noindex"], e.target.checked || undefined)}
        />
        Hide from search engines (the page stays reachable by its address)
      </label>

      <p className={c.label}>In Google</p>
      <div className={s.serp} aria-label="Google preview">
        <span className={s.serpUrl}>{url}</span>
        <span className={s.serpTitle}>{truncate(shownTitle, TITLE_FITS)}</span>
        <span className={s.serpText}>
          {description
            ? truncate(description, DESCRIPTION_FITS)
            : "Google will pick text from the page."}
        </span>
      </div>

      <p className={c.label} style={{ marginTop: 16 }}>
        When shared
      </p>
      <div className={s.share} aria-label="Share preview">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview of the share crop
          <img
            src={mediaUrl(image, pickWidth(image, 640), "webp")}
            alt=""
            style={{ objectPosition: `${image.focalX / 10}% ${image.focalY / 10}%` }}
          />
        ) : (
          <span className={s.shareEmpty}>No share image</span>
        )}
        <span className={s.shareBody}>
          <span className={s.serpUrl}>{site.host}</span>
          <strong>{truncate(shownTitle, 90)}</strong>
        </span>
      </div>
    </details>
  );
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
