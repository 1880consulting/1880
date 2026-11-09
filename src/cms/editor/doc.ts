import type { Field } from "../content/fields";
import type { EntryDoc, Issue, StoredBlock } from "../content/types";

/** What the editor needs to know about each kind of block (plain data). */
export interface BlockType {
  type: string;
  label: string;
  description?: string;
  fields: Field[];
  defaults: Record<string, unknown>;
}

export type Path = (string | number)[];

export const pathKey = (path: Path) => path.join(".");

export function getAt(obj: unknown, path: Path): unknown {
  return path.reduce<unknown>(
    (o, k) => (o == null ? undefined : (o as Record<string | number, unknown>)[k]),
    obj,
  );
}

/** Returns a copy of `obj` with `value` at `path` (copies only along the path). */
export function setAt<T>(obj: T, path: Path, value: unknown): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path;
  const base = (obj ?? (typeof head === "number" ? [] : {})) as Record<string | number, unknown>;
  const copy = (Array.isArray(base) ? [...base] : { ...base }) as Record<string | number, unknown>;
  copy[head] = setAt(base[head], rest, value);
  return copy as T;
}

export function newBlockId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function newBlock(t: BlockType): StoredBlock {
  return { id: newBlockId(), type: t.type, ...structuredClone(t.defaults) };
}

const isEmpty = (v: unknown) =>
  v === undefined || v === null || (typeof v === "string" && v.trim() === "");

/** Drops empty optional values, so "left blank" means "not set" (e.g. no button). */
function tidyFields(fields: Field[], value: Record<string, unknown>): Record<string, unknown> {
  const out = { ...value };
  for (const f of fields) {
    const v = out[f.key];
    if (f.kind === "text" || f.kind === "select") {
      if (!f.required && isEmpty(v)) delete out[f.key];
    } else if (f.kind === "group") {
      if (v && typeof v === "object") {
        const inner = tidyFields(f.fields, v as Record<string, unknown>);
        const allEmpty = f.fields.every((sub) => isEmpty(inner[sub.key]));
        if (allEmpty && !f.required) delete out[f.key];
        else out[f.key] = inner;
      }
    }
  }
  return out;
}

export function tidyDoc(doc: EntryDoc, types: BlockType[]): EntryDoc {
  const seo = { ...doc.seo };
  if (isEmpty(seo.title)) delete seo.title;
  if (isEmpty(seo.description)) delete seo.description;
  return {
    title: doc.title,
    seo,
    blocks: doc.blocks.map((b) => {
      const t = types.find((x) => x.type === b.type);
      return t ? (tidyFields(t.fields, b) as StoredBlock) : b;
    }),
  };
}

/** Issues from the server, by field path ("blocks.2.title"). */
export function issueMap(issues: Issue[] | undefined): Map<string, string> {
  return new Map((issues ?? []).map((i) => [pathKey(i.path), i.message]));
}

/** A one-line description of a block for its collapsed card: its main (required) text first. */
export function blockSummary(block: StoredBlock, t: BlockType | undefined): string {
  const fields = [...(t?.fields ?? [])].sort(
    (a, b) => Number(b.kind === "text" && b.required) - Number(a.kind === "text" && a.required),
  );
  for (const f of fields) {
    const v = block[f.key];
    if (f.kind === "text" && typeof v === "string" && v.trim()) return v.trim();
    if (f.kind === "list" && Array.isArray(v) && v.length) return v.join(", ");
  }
  return "";
}
