import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireStaff } from "@/cms/auth";
import { blockFields, schemaFields } from "@/cms/content/fields";
import { PageEditor } from "@/cms/editor/PageEditor";
import { mediaRefs } from "@/cms/media/refs";
import { getMediaMany } from "@/cms/media/store";
import { formatBytes } from "@/cms/media/types";
import { shortDate } from "@/cms/format";
import { buttonClass, controls as c, PageHeader, Panel, Skeleton } from "@/cms/ui";
import {
  documentReceipts,
  getDocument,
  KIND_LABELS,
  listDocumentFiles,
  MAX_DOCUMENT_FILE_MB,
  MAX_INTERACTIVE_MB,
  type Receipt,
  type FileInfo,
} from "@/lib/portal/documents";
import { getTenant } from "@/lib/portal/manage";
import { portalOrigin } from "@/lib/portal/origin";
import { documentFields, documentType } from "@/portal/blocks/schema";
import { listMediaForPicker } from "../../../../media/actions";
import { AttachmentDelete } from "../../../AttachmentActions";
import {
  deleteAttachmentAction,
  deleteDocumentAction,
  discardDocumentAction,
  publishDocumentAction,
  saveDocumentAction,
  saveDocumentDetailsAction,
  setDocumentKindAction,
  unpublishDocumentAction,
} from "../../../document-actions";
import { DocumentDetailsForm } from "../../../DocumentDetailsForm";
import { DocumentPublish } from "../../../DocumentPublish";
import { DocumentUpload } from "../../../DocumentUpload";
import { KindSelect } from "../../../KindSelect";

export const metadata = { title: "Document" };

type Props = PageProps<"/admin/clients/[id]/documents/[docId]">;

export default function DocumentEditorPage({ params }: Props) {
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

const BLOCK_TYPES = documentType.blocks.map((b) => ({
  type: b.type,
  label: b.label,
  description: b.description,
  fields: blockFields(b),
  defaults: b.defaults,
}));

async function Editor({ params }: Pick<Props, "params">) {
  await requireStaff();
  const { id: tenantId, docId } = await params;
  if (!z.uuid().safeParse(tenantId).success || !z.uuid().safeParse(docId).success) notFound();
  const [tenant, found] = await Promise.all([getTenant(tenantId), getDocument(docId)]);
  if (!tenant || !found || found.document.tenantId !== tenantId) notFound();
  const { document, draft } = found;
  const [files, receipts, origin] = await Promise.all([
    listDocumentFiles(docId),
    documentReceipts(docId),
    portalOrigin(),
  ]);
  const attachments = files.filter((f) => f.purpose === "attachment");
  const clientUrl = `${origin}/${tenant.slug}/d/${docId}`;
  const back = `/admin/clients/${tenantId}`;
  const published = document.status === "published";
  const actions = {
    publish: publishDocumentAction.bind(null, tenantId, docId),
    unpublish: unpublishDocumentAction.bind(null, tenantId, docId),
    remove: deleteDocumentAction.bind(null, tenantId, docId),
  };

  const sidePanels = (
    <>
      {document.format === "blocks" && (
        <Panel title="Attachments">
          <p className={c.hint} style={{ marginTop: 0 }}>
            Files the client can download. Add a Files section to show them in the document.
          </p>
          <FileList files={attachments} tenantId={tenantId} docId={docId} deletable />
          <DocumentUpload
            documentId={docId}
            purpose="attachment"
            label={`Upload an attachment (up to ${MAX_DOCUMENT_FILE_MB} MB)`}
          />
        </Panel>
      )}
      <Panel title="Who opened it">
        <Receipts receipts={receipts} published={published} />
      </Panel>
    </>
  );

  if (document.format === "blocks") {
    const media = await getMediaMany(mediaRefs(documentType, draft).map((r) => r.id));
    return (
      <>
        <div className={c.actions} style={{ marginBottom: 12, justifyContent: "flex-end" }}>
          <KindSelect
            value={document.kind}
            action={setDocumentKindAction.bind(null, tenantId, docId)}
          />
        </div>
        <PageEditor
          key={docId}
          mode="document"
          initial={{ doc: draft, slug: "", versionId: document.draftVersionId }}
          initialMedia={media}
          labels={{ singular: "document", plural: tenant.name }}
          site={{ name: "1880", host: origin }}
          entryFields={schemaFields(documentFields)}
          refOptions={{ attachments: attachments.map((f) => ({ id: f.id, title: f.filename })) }}
          status={{ published, hasChanges: found.hasChanges, isHome: false }}
          blockTypes={BLOCK_TYPES}
          addressPrefix=""
          basePath=""
          liveUrl={clientUrl}
          previewUrl={`/admin/preview/document/${docId}`}
          historyUrl={`${back}/documents/${docId}/history`}
          backUrl={back}
          notifyLabel={`Email ${tenant.name}'s people`}
          messages={{
            published: `Published. ${tenant.name} can see it now.`,
            unpublished: `Unpublished. ${tenant.name} no longer sees it; the draft is kept.`,
            unpublishConfirm: `Take this document away from ${tenant.name}? The draft is kept.`,
          }}
          actions={{
            ...actions,
            save: saveDocumentAction.bind(null, tenantId, docId),
            discard: discardDocumentAction.bind(null, tenantId, docId),
            listMedia: listMediaForPicker,
          }}
        />
        <div className={c.split} style={{ marginTop: 24 }}>
          {sidePanels}
        </div>
      </>
    );
  }

  const isInteractive = document.format === "interactive";
  const current = draft.file ? files.find((f) => f.id === draft.file) : undefined;
  return (
    <>
      <PageHeader
        pretitle={
          <Link href={back} style={{ color: "inherit" }}>
            {tenant.name}
          </Link>
        }
        title={draft.title || "Untitled"}
        description={`${KIND_LABELS[document.kind]} · ${isInteractive ? "Interactive page" : "File"}`}
        actions={
          published ? (
            <a href={clientUrl} target="_blank" rel="noreferrer" className={buttonClass("ghost")}>
              View in the portal
            </a>
          ) : undefined
        }
      />
      <div className={c.split}>
        <div style={{ display: "grid", gap: 24, alignContent: "start" }}>
          <Panel title={isInteractive ? "Interactive page" : "File"}>
            {current ? (
              <p style={{ marginTop: 0 }}>
                <strong>{current.filename}</strong>{" "}
                <span className={c.meta}>{formatBytes(current.bytes)}</span>{" "}
                <a
                  href={
                    isInteractive
                      ? `/admin/documents/${docId}/page`
                      : `/admin/documents/${docId}/files/${current.id}`
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
              </p>
            ) : (
              <p className={c.meta} style={{ marginTop: 0 }}>
                Nothing uploaded yet.
              </p>
            )}
            <DocumentUpload
              documentId={docId}
              purpose={isInteractive ? "interactive" : "file"}
              accept={isInteractive ? ".html,.htm,text/html" : undefined}
              label={
                current
                  ? "Replace with a new version"
                  : isInteractive
                    ? `Upload the page: one self-contained .html file, up to ${MAX_INTERACTIVE_MB} MB`
                    : `Upload a PDF, Word, Excel, PowerPoint, CSV, image or zip file, up to ${MAX_DOCUMENT_FILE_MB} MB`
              }
            />
            {isInteractive && (
              <p className={c.hint}>
                The page runs in a sealed frame: it can use inline code, Google Fonts and libraries
                from jsDelivr, cdnjs or unpkg, and nothing else. Embed images in the file.
              </p>
            )}
          </Panel>
          {isInteractive && current && (
            <Panel title="Preview as the client sees it">
              <iframe
                src={`/admin/documents/${docId}/page`}
                title="Interactive page preview"
                sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                style={{ width: "100%", height: 560, border: "1px solid var(--os-border)" }}
              />
            </Panel>
          )}
          <Panel title="Details">
            <DocumentDetailsForm
              initial={{
                title: draft.title,
                summary: typeof draft.fields?.summary === "string" ? draft.fields.summary : "",
                kind: document.kind,
              }}
              action={saveDocumentDetailsAction.bind(null, tenantId, docId)}
            />
          </Panel>
        </div>
        <div style={{ display: "grid", gap: 24, alignContent: "start" }}>
          <Panel title="Publish">
            <DocumentPublish
              published={published}
              hasChanges={found.hasChanges}
              clientName={tenant.name}
              actions={actions}
            />
            <p className={c.hint}>
              <Link href={`${back}/documents/${docId}/history`}>History</Link>: every upload and
              edit, with restore.
            </p>
          </Panel>
          {sidePanels}
        </div>
      </div>
    </>
  );
}

function FileList({
  files,
  tenantId,
  docId,
  deletable,
}: {
  files: FileInfo[];
  tenantId: string;
  docId: string;
  deletable?: boolean;
}) {
  if (!files.length) return null;
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px" }}>
      {files.map((f) => (
        <li key={f.id} className={c.actions} style={{ alignItems: "center", marginBottom: 6 }}>
          <a href={`/admin/documents/${docId}/files/${f.id}`} target="_blank" rel="noreferrer">
            {f.filename}
          </a>
          <span className={c.meta}>{formatBytes(f.bytes)}</span>
          {deletable && (
            <AttachmentDelete action={deleteAttachmentAction.bind(null, tenantId, docId, f.id)} />
          )}
        </li>
      ))}
    </ul>
  );
}

function Receipts({ receipts, published }: { receipts: Receipt[]; published: boolean }) {
  if (!receipts.length)
    return (
      <p className={c.meta} style={{ margin: 0 }}>
        {published ? "Nobody has opened it yet." : "Publish it, and you'll see who opens it here."}
      </p>
    );
  return (
    <table className={c.table}>
      <thead>
        <tr>
          <th scope="col">Person</th>
          <th scope="col">Last opened</th>
          <th scope="col" className={c.hideSm}>
            Opens
          </th>
          <th scope="col" className={c.hideSm}>
            Downloads
          </th>
        </tr>
      </thead>
      <tbody>
        {receipts.map((r) => (
          <tr key={r.email}>
            <td>
              {r.name}
              <div className={c.meta}>{r.email}</div>
            </td>
            <td className={c.num}>{r.lastViewedAt ? shortDate(r.lastViewedAt) : "Not yet"}</td>
            <td className={`${c.num} ${c.hideSm}`}>{r.views}</td>
            <td className={`${c.num} ${c.hideSm}`}>{r.downloads}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
