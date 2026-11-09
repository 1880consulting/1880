import type { EntryDoc } from "../content/types";
import type { MediaInfo } from "../media/types";

/**
 * Messages between the editor and its live preview frame (same site only).
 * The preview says it's ready; the editor sends the current draft, and the
 * images it uses, on every change.
 */
export const PREVIEW_READY = "cms:preview-ready";
export const PREVIEW_DOC = "cms:preview-doc";

export type PreviewMessage =
  | { type: typeof PREVIEW_READY }
  | { type: typeof PREVIEW_DOC; doc: EntryDoc; media: Record<string, MediaInfo> };
