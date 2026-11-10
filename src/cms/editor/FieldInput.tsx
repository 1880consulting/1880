"use client";

import { IconPhoto, IconPlus, IconX } from "@tabler/icons-react";
import { Badge, Button, controls as c } from "../ui/client";
import { mediaUrl, pickWidth } from "../media/types";
import mediaStyles from "../media/media.module.css";
import { useMediaField } from "./mediaField";
import type { Field } from "../content/fields";
import { pathKey, type Path } from "./doc";
import s from "./editor.module.css";

interface Props {
  field: Field;
  value: unknown;
  path: Path;
  errors: Map<string, string>;
  onChange: (path: Path, value: unknown) => void;
}

const idFor = (path: Path) => `f-${pathKey(path).replace(/[^a-zA-Z0-9-]/g, "-")}`;

function Label({
  field,
  htmlFor,
  optional,
}: {
  field: Field;
  htmlFor?: string;
  optional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className={c.label}>
      {field.label}
      {optional && <span className={s.optional}> Optional</span>}
    </label>
  );
}

function ErrorText({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={`${id}-error`} className={c.error}>
      {message}
    </p>
  ) : null;
}

/** One form control for one field of a block, built from its description. */
export function FieldInput({ field, value, path, errors, onChange }: Props) {
  const id = idFor(path);
  const error = errors.get(pathKey(path));
  const describedBy =
    [field.help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  const help = field.help ? (
    <p id={`${id}-help`} className={c.hint}>
      {field.help}
    </p>
  ) : null;

  switch (field.kind) {
    case "text": {
      const text = typeof value === "string" ? value : "";
      const props = {
        id,
        value: text,
        maxLength: field.maxLength,
        className: c.input,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          onChange(path, e.target.value),
      };
      return (
        <div className={c.field}>
          <div className={s.labelRow}>
            <Label field={field} htmlFor={id} optional={!field.required} />
            {field.maxLength && (
              <span className={s.count} aria-hidden>
                {text.length}/{field.maxLength}
              </span>
            )}
          </div>
          {field.multiline ? <textarea rows={3} {...props} /> : <input type="text" {...props} />}
          {help}
          <ErrorText id={id} message={error} />
        </div>
      );
    }

    case "image":
      return (
        <ImageField
          field={field}
          value={value}
          path={path}
          error={error}
          id={id}
          help={help}
          onChange={onChange}
        />
      );

    case "number":
      return (
        <div className={c.field}>
          <Label field={field} htmlFor={id} optional={!field.required} />
          <input
            id={id}
            type="number"
            inputMode="numeric"
            className={c.input}
            style={{ maxWidth: 160 }}
            min={field.min}
            max={field.max}
            value={typeof value === "number" ? value : ""}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            onChange={(e) =>
              onChange(path, e.target.value === "" ? undefined : Number(e.target.value))
            }
          />
          {help}
          <ErrorText id={id} message={error} />
        </div>
      );

    case "refs":
      return (
        <RefsField
          field={field}
          value={value}
          path={path}
          error={error}
          id={id}
          help={help}
          onChange={onChange}
        />
      );

    case "boolean":
      return (
        <div className={c.field}>
          <label className={s.check}>
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) => onChange(path, e.target.checked)}
            />
            {field.label}
          </label>
          {help}
        </div>
      );

    case "select":
      return (
        <div className={c.field}>
          <Label field={field} htmlFor={id} optional={!field.required} />
          <select
            id={id}
            className={c.input}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(path, e.target.value)}
          >
            {!field.required && <option value="">None</option>}
            {field.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {help}
          <ErrorText id={id} message={error} />
        </div>
      );

    case "list": {
      const items = Array.isArray(value) ? (value as string[]) : [];
      const canAdd = field.max === undefined || items.length < field.max;
      return (
        <fieldset className={s.fieldset} aria-describedby={describedBy}>
          <legend className={c.label}>{field.label}</legend>
          {help}
          <ol className={s.list}>
            {items.map((item, i) => {
              const itemPath = [...path, i];
              const itemError = errors.get(pathKey(itemPath));
              return (
                <li key={i}>
                  <div className={s.listRow}>
                    <input
                      className={c.input}
                      value={item}
                      maxLength={field.maxLength}
                      aria-label={`${field.label} ${i + 1}`}
                      aria-invalid={itemError ? true : undefined}
                      onChange={(e) => onChange(itemPath, e.target.value)}
                    />
                    <button
                      type="button"
                      className={s.iconButton}
                      aria-label={`Remove ${field.label.toLowerCase()} ${i + 1}`}
                      onClick={() =>
                        onChange(
                          path,
                          items.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <IconX size={16} stroke={2} aria-hidden />
                    </button>
                  </div>
                  {itemError && <p className={c.error}>{itemError}</p>}
                </li>
              );
            })}
          </ol>
          {canAdd && (
            <button
              type="button"
              className={s.addItem}
              onClick={() => onChange(path, [...items, ""])}
            >
              <IconPlus size={16} stroke={2} aria-hidden />
              Add
            </button>
          )}
          <ErrorText id={id} message={error} />
        </fieldset>
      );
    }

    case "group": {
      const obj = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
      return (
        <fieldset className={s.fieldset}>
          <legend className={c.label}>
            {field.label}
            {!field.required && <span className={s.optional}> Optional: leave blank for none</span>}
          </legend>
          {help}
          {field.fields.map((sub) => (
            <FieldInput
              key={sub.key}
              field={sub}
              value={obj[sub.key]}
              path={[...path, sub.key]}
              errors={errors}
              onChange={onChange}
            />
          ))}
        </fieldset>
      );
    }
  }
}

/** An image from the media library: a thumbnail, its alt-text status, and buttons to choose or remove. */
function ImageField({
  field,
  value,
  path,
  error,
  id,
  help,
  onChange,
}: {
  field: Extract<Field, { kind: "image" }>;
  value: unknown;
  path: Path;
  error?: string;
  id: string;
  help: React.ReactNode;
  onChange: (path: Path, value: unknown) => void;
}) {
  const { media, choose } = useMediaField();
  const chosen = typeof value === "string" && value ? media[value] : undefined;
  return (
    <div className={c.field}>
      <span className={c.label} id={`${id}-label`}>
        {field.label}
        {!field.required && <span className={s.optional}> Optional</span>}
      </span>
      <div className={mediaStyles.field} aria-labelledby={`${id}-label`} role="group">
        {chosen ? (
          // eslint-disable-next-line @next/next/no-img-element -- library thumbnail
          <img
            className={mediaStyles.fieldThumb}
            src={mediaUrl(chosen, pickWidth(chosen, 160), "webp")}
            alt=""
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
          {chosen ? (
            <>
              <span className={mediaStyles.name}>{chosen.filename}</span>
              {chosen.alt.trim() ? (
                <span className={c.meta}>{chosen.alt}</span>
              ) : (
                <Badge tone="warning">Needs alt text</Badge>
              )}
            </>
          ) : (
            <span className={c.meta}>
              {value ? "This image was deleted from the library." : "No image chosen"}
            </span>
          )}
        </span>
        <Button size="sm" onClick={() => choose(path)}>
          {chosen ? "Change" : "Choose image"}
        </Button>
        {Boolean(value) && (
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Remove ${field.label.toLowerCase()}`}
            onClick={() => onChange(path, "")}
          >
            <IconX size={16} stroke={2} aria-hidden />
          </Button>
        )}
      </div>
      {help}
      {error && (
        <p id={`${id}-error`} className={c.error}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Pick entries of another type (e.g. a case study's services), as a list of checkboxes. */
function RefsField({
  field,
  value,
  path,
  error,
  id,
  help,
  onChange,
}: {
  field: Extract<Field, { kind: "refs" }>;
  value: unknown;
  path: Path;
  error?: string;
  id: string;
  help: React.ReactNode;
  onChange: (path: Path, value: unknown) => void;
}) {
  const { refOptions } = useMediaField();
  const options = refOptions[field.ref] ?? [];
  const chosen = Array.isArray(value) ? (value as string[]) : [];
  const full = field.max !== undefined && chosen.length >= field.max;
  return (
    <fieldset className={s.fieldset} aria-describedby={error ? `${id}-error` : undefined}>
      <legend className={c.label}>
        {field.label} <span className={s.optional}>Optional</span>
      </legend>
      {help}
      {options.length === 0 ? (
        <p className={c.hint}>Nothing to choose yet. Create and publish some first.</p>
      ) : (
        <div className={s.list} style={{ marginBottom: 12 }}>
          {options.map((o) => {
            const on = chosen.includes(o.id);
            return (
              <label key={o.id} className={s.check}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!on && full}
                  onChange={() =>
                    onChange(path, on ? chosen.filter((x) => x !== o.id) : [...chosen, o.id])
                  }
                />
                {o.title}
              </label>
            );
          })}
        </div>
      )}
      {error && (
        <p id={`${id}-error`} className={c.error}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
