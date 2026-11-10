"use client";

import { useEffect, useState } from "react";
import type { EntryDoc } from "../content/types";
import type { MediaInfo } from "../media/types";
import { PREVIEW_DOC, PREVIEW_READY, type PreviewMessage } from "./protocol";

/**
 * Inside the preview frame: starts with the saved draft, then follows what
 * the editor sends as it changes. Only messages from this same site count.
 */
export function usePreviewDoc(
  initial: EntryDoc,
  initialMedia: Record<string, MediaInfo>,
): { doc: EntryDoc; media: Record<string, MediaInfo> } {
  const [state, setState] = useState({ doc: initial, media: initialMedia });
  useEffect(() => {
    const onMessage = (e: MessageEvent<PreviewMessage>) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      if (e.data?.type === PREVIEW_DOC) setState({ doc: e.data.doc, media: e.data.media });
    };
    window.addEventListener("message", onMessage);
    if (window.parent !== window)
      window.parent.postMessage({ type: PREVIEW_READY }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return state;
}
