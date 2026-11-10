import { IconRestore } from "@tabler/icons-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireStaff } from "@/cms/auth";
import { longDate } from "@/cms/format";
import { listStaff } from "@/cms/staff/service";
import { Badge, Button, controls as c, PageHeader, Panel, Skeleton } from "@/cms/ui";
import { getDocument, listDocumentVersions, type DocumentDoc } from "@/lib/portal/documents";
import { restoreDocumentVersionAction } from "../../../../document-actions";

type Props = PageProps<"/admin/clients/[id]/documents/[docId]/history">;

export const metadata = { title: "History" };

/** Every saved version of a document (edits and uploads), with Restore. */
export default function DocumentHistoryPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <Panel>
          <Skeleton />
        </Panel>
      }
    >
      <History params={params} />
    </Suspense>
  );
}

async function History({ params }: Pick<Props, "params">) {
  await requireStaff();
  const { id: tenantId, docId } = await params;
  if (!z.uuid().safeParse(tenantId).success || !z.uuid().safeParse(docId).success) notFound();
  const found = await getDocument(docId);
  if (!found || found.document.tenantId !== tenantId) notFound();
  const [versions, staff] = await Promise.all([listDocumentVersions(docId), listStaff()]);
  const names = new Map(staff.map((p) => [p.id, p.name]));
  const { document } = found;
  const editor = `/admin/clients/${tenantId}/documents/${docId}`;

  return (
    <>
      <PageHeader
        pretitle={<Link href={editor}>{found.draft.title || "Untitled"}</Link>}
        title="History"
        description="Every save and upload is kept. Restoring one makes it the draft again; publish it to show it to the client."
      />
      <Panel flush>
        <table className={c.table}>
          <thead>
            <tr>
              <th scope="col">Saved</th>
              <th scope="col">By</th>
              <th scope="col" className={c.hideSm}>
                What
              </th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id}>
                <td className={c.num}>
                  {longDate(v.createdAt)}{" "}
                  {v.id === document.publishedVersionId && <Badge tone="success">Live</Badge>}{" "}
                  {v.id === document.draftVersionId && v.id !== document.publishedVersionId && (
                    <Badge tone="info">Current draft</Badge>
                  )}
                </td>
                <td>{(v.authorId && names.get(v.authorId)) || "Someone"}</td>
                <td className={`${c.meta} ${c.hideSm}`}>
                  {v.note ?? `“${(v.doc as DocumentDoc).title || "Untitled"}”`}
                </td>
                <td>
                  {v.id !== document.draftVersionId && (
                    <form action={restoreDocumentVersionAction.bind(null, tenantId, docId, v.id)}>
                      <Button type="submit" size="sm" variant="ghost">
                        <IconRestore size={16} stroke={2} aria-hidden />
                        Restore
                      </Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
