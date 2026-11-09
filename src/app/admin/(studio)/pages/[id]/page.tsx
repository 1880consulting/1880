import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireStaff } from "@/cms/auth";
import { blockFields } from "@/cms/content/fields";
import { getEntry } from "@/cms/content/store";
import { PageEditor } from "@/cms/editor/PageEditor";
import { Panel, Skeleton } from "@/cms/ui";
import { pageType } from "@/site/cms";
import { deletePage, discardPageChanges, publishPage, savePage, unpublishPage } from "../actions";

export const metadata = { title: "Edit page" };

export default function EditPage({ params }: PageProps<"/admin/pages/[id]">) {
  return (
    <Suspense
      fallback={
        <Panel>
          <Skeleton lines={8} />
        </Panel>
      }
    >
      <Editor params={params} />
    </Suspense>
  );
}

const BLOCK_TYPES = pageType.blocks.map((b) => ({
  type: b.type,
  label: b.label,
  description: b.description,
  fields: blockFields(b),
  defaults: b.defaults,
}));

async function Editor({ params }: Pick<PageProps<"/admin/pages/[id]">, "params">) {
  await requireStaff();
  const { id } = await params;
  const found = z.uuid().safeParse(id).success ? await getEntry(id) : null;
  if (!found) notFound();
  const { entry, draft } = found;

  return (
    <PageEditor
      // Keyed by page, not version: saving makes new versions, and the editor
      // must keep its state (and messages) when Next.js refreshes after publish.
      key={entry.id}
      initial={{ doc: draft, slug: entry.slug, versionId: entry.draftVersionId }}
      status={{
        published: entry.status === "published",
        hasChanges:
          entry.status === "published" &&
          (entry.draftVersionId !== entry.publishedVersionId || entry.slug !== entry.publishedSlug),
        isHome: entry.slug === "",
      }}
      blockTypes={BLOCK_TYPES}
      addressPrefix="1880.io/"
      basePath="/"
      previewUrl={`/admin/preview/${entry.id}`}
      historyUrl={`/admin/pages/${entry.id}/history`}
      backUrl="/admin/pages"
      actions={{
        save: savePage.bind(null, entry.id),
        publish: publishPage.bind(null, entry.id),
        discard: discardPageChanges.bind(null, entry.id),
        unpublish: unpublishPage.bind(null, entry.id),
        remove: deletePage.bind(null, entry.id),
      }}
    />
  );
}
