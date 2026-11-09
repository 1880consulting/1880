import { blockFields, type Field } from "../content/fields";
import type { ContentType, EntryDoc, Issue } from "../content/types";
import type { MediaInfo } from "./types";

/** Every image a document uses (from its blocks' image fields), with where each one sits. */
export function mediaRefs(
  type: ContentType,
  doc: EntryDoc,
): { id: string; path: (string | number)[] }[] {
  const refs: { id: string; path: (string | number)[] }[] = [];
  const walk = (fields: Field[], value: Record<string, unknown>, path: (string | number)[]) => {
    for (const f of fields) {
      const v = value?.[f.key];
      if (f.kind === "image" && typeof v === "string" && v)
        refs.push({ id: v, path: [...path, f.key] });
      if (f.kind === "group" && v && typeof v === "object")
        walk(f.fields, v as Record<string, unknown>, [...path, f.key]);
    }
  };
  doc.blocks.forEach((block, i) => {
    if (block.hidden) return;
    const def = type.blocks.find((b) => b.type === block.type);
    if (def) walk(blockFields(def), block, ["blocks", i]);
  });
  return refs;
}

/** Before publishing: every image must still exist and have alt text (PLAN D26). */
export function mediaIssues(
  refs: ReturnType<typeof mediaRefs>,
  found: Record<string, MediaInfo>,
): Issue[] {
  return refs.flatMap(({ id, path }): Issue[] => {
    const m = found[id];
    if (!m) return [{ path, message: "This image was deleted from the library. Choose another." }];
    if (!m.alt.trim())
      return [{ path, message: `Add alt text to "${m.filename}" in the media library first.` }];
    return [];
  });
}
