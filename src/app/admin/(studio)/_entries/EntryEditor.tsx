import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireStaff } from "@/cms/auth";
import { blockFields, schemaFields, type Field } from "@/cms/content/fields";
import { getEntry, listEntries } from "@/cms/content/store";
import { PageEditor } from "@/cms/editor/PageEditor";
import { mediaRefs } from "@/cms/media/refs";
import { getMediaMany } from "@/cms/media/store";
import { Panel, Skeleton } from "@/cms/ui";
import { CONTENT_TYPES, type ContentTypeId } from "@/site/cms";
import { site } from "@/site/content";
import { listMediaForPicker } from "../media/actions";
import { activePreviewLinks } from "@/cms/content/preview-links";
import {
  createPreviewLinkAction,
  deleteEntryAction,
  discardEntryAction,
  publishEntryAction,
  revokePreviewLinkAction,
  saveEntryAction,
  unpublishEntryAction,
} from "./actions";
import { STUDIO } from "./config";
import { SharePreview } from "./SharePreview";

/** Studio's editor for one entry of any content type. */
export function EntryEditorPage({
  typeId,
  params,
}: {
  typeId: ContentTypeId;
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <Panel>
          <Skeleton lines={8} />
        </Panel>
      }
    >
      <Editor typeId={typeId} params={params} />
    </Suspense>
  );
}

const blockTypesFor = (typeId: ContentTypeId) =>
  CONTENT_TYPES[typeId].blocks.map((b) => ({
    type: b.type,
    label: b.label,
    description: b.description,
    fields: blockFields(b),
    defaults: b.defaults,
  }));

/** Entries that this type's reference fields can pick, by type id. */
async function referenceOptions(fields: Field[]) {
  const out: Record<string, { id: string; title: string }[]> = {};
  for (const f of fields) {
    if (f.kind === "refs" && !out[f.ref]) {
      out[f.ref] = (await listEntries(f.ref)).map((e) => ({ id: e.id, title: e.title }));
    }
  }
  return out;
}

async function Editor({
  typeId,
  params,
}: {
  typeId: ContentTypeId;
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const type = CONTENT_TYPES[typeId];
  const cfg = STUDIO[typeId];
  const { id } = await params;
  const found = z.uuid().safeParse(id).success ? await getEntry(id) : null;
  if (!found || found.entry.type !== type.id) notFound();
  const { entry, draft } = found;
  const entryFields = type.fields ? schemaFields(type.fields) : [];
  const [initialMedia, refOptions, links] = await Promise.all([
    getMediaMany(mediaRefs(type, draft).map((r) => r.id)),
    referenceOptions(entryFields),
    activePreviewLinks(entry.id),
  ]);

  return (
    <PageEditor
      // Keyed by entry, not version: saving makes new versions, and the editor
      // must keep its state (and messages) when Next.js refreshes after publish.
      key={entry.id}
      initial={{ doc: draft, slug: entry.slug, versionId: entry.draftVersionId }}
      initialMedia={initialMedia}
      labels={{ singular: cfg.singular, plural: type.plural }}
      site={{ name: site.name, host: "1880.io" }}
      entryFields={entryFields}
      refOptions={refOptions}
      status={{
        published: entry.status === "published",
        hasChanges:
          entry.status === "published" &&
          (entry.draftVersionId !== entry.publishedVersionId || entry.slug !== entry.publishedSlug),
        isHome: type.allowHome === true && entry.slug === "",
      }}
      blockTypes={blockTypesFor(typeId)}
      addressPrefix={cfg.addressPrefix}
      basePath={cfg.livePrefix}
      previewUrl={`/admin/preview/${entry.id}`}
      historyUrl={`${cfg.base}/${entry.id}/history`}
      backUrl={cfg.base}
      toolbarExtra={
        <SharePreview
          initial={links.map((l) => ({
            id: l.id,
            createdAt: l.createdAt.toISOString(),
            expiresAt: l.expiresAt.toISOString(),
          }))}
          create={createPreviewLinkAction.bind(null, typeId, entry.id)}
          revoke={revokePreviewLinkAction.bind(null, typeId, entry.id)}
        />
      }
      actions={{
        save: saveEntryAction.bind(null, typeId, entry.id),
        publish: publishEntryAction.bind(null, typeId, entry.id),
        discard: discardEntryAction.bind(null, typeId, entry.id),
        unpublish: unpublishEntryAction.bind(null, typeId, entry.id),
        remove: deleteEntryAction.bind(null, typeId, entry.id),
        listMedia: listMediaForPicker,
      }}
    />
  );
}
