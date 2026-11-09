import type { EntryDoc } from "../content/types";

/**
 * Messages between the editor and its live preview frame (same site only).
 * The preview says it's ready; the editor sends the current draft on every change.
 */
export const PREVIEW_READY = "cms:preview-ready";
export const PREVIEW_DOC = "cms:preview-doc";

export type PreviewMessage =
  { type: typeof PREVIEW_READY } | { type: typeof PREVIEW_DOC; doc: EntryDoc };
