"use client";

import type { EntryDoc } from "@/cms/content/types";
import { usePreviewDoc } from "@/cms/editor/usePreviewDoc";
import type { MediaInfo } from "@/cms/media/types";
import { DocumentBody } from "./DocumentBody";

/** A document as the editor currently has it, rendered exactly like the portal page. */
export function DocumentPreview({
  documentId,
  kindLabel,
  initial,
  initialMedia,
  files,
}: {
  documentId: string;
  kindLabel: string;
  initial: EntryDoc;
  initialMedia: Record<string, MediaInfo>;
  files: Record<string, { filename: string; bytes: number }>;
}) {
  const { doc, media } = usePreviewDoc(initial, initialMedia);
  return (
    <DocumentBody
      kindLabel={kindLabel}
      doc={doc}
      context={{
        media,
        files,
        fileHref: (fileId) => `/admin/documents/${documentId}/files/${fileId}`,
      }}
    />
  );
}
