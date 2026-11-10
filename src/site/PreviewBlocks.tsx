"use client";

import { RenderBlocks, visibleBlocks } from "@/blocks";
import type { EntryDoc } from "@/cms/content/types";
import { usePreviewDoc } from "@/cms/editor/usePreviewDoc";
import type { MediaInfo } from "@/cms/media/types";
import { EntryView } from "./entries/EntryView";
import type { ListedEntry } from "./pages";
import section from "./section.module.css";

type Listed = Pick<ListedEntry, "id" | "path" | "doc">;

/** The entry as the editor currently has it, rendered exactly like the public page. */
export function PreviewBlocks({
  type,
  initial,
  initialMedia,
  email,
  services,
  relatedWork,
}: {
  type: string;
  initial: EntryDoc;
  initialMedia: Record<string, MediaInfo>;
  email: string;
  services: Listed[];
  relatedWork?: Listed[];
}) {
  const { doc, media } = usePreviewDoc(initial, initialMedia);
  if (type === "work" || type === "service") {
    return (
      <EntryView
        type={type}
        doc={doc}
        media={media}
        services={services}
        relatedWork={relatedWork}
        email={email}
      />
    );
  }
  const blocks = visibleBlocks(doc);
  if (blocks.length === 0) {
    return (
      <section className={`${section.section} ${section.chapter}`}>
        <div className={section.wrap}>
          <p className={section.mid}>Add a section in the editor and it appears here.</p>
        </div>
      </section>
    );
  }
  return <RenderBlocks blocks={blocks} context={{ email, media }} />;
}
