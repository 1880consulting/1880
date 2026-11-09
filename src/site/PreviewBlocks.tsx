"use client";

import { RenderBlocks, visibleBlocks } from "@/blocks";
import type { EntryDoc } from "@/cms/content/types";
import { usePreviewDoc } from "@/cms/editor/usePreviewDoc";
import section from "./section.module.css";

/** The page as the editor currently has it, rendered with the real site blocks. */
export function PreviewBlocks({ initial, email }: { initial: EntryDoc; email: string }) {
  const doc = usePreviewDoc(initial);
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
  return <RenderBlocks blocks={blocks} context={{ email }} />;
}
