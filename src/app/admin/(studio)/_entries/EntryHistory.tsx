import { IconRestore } from "@tabler/icons-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireStaff } from "@/cms/auth";
import { getEntry, listVersions } from "@/cms/content/store";
import { longDate } from "@/cms/format";
import { listStaff } from "@/cms/staff/service";
import { Badge, Button, controls as c, PageHeader, Panel, Skeleton } from "@/cms/ui";
import { CONTENT_TYPES, type ContentTypeId } from "@/site/cms";
import { restoreEntryVersion } from "./actions";
import { STUDIO } from "./config";

/** Every saved version of an entry, with Restore. */
export function EntryHistoryPage({
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
          <Skeleton />
        </Panel>
      }
    >
      <History typeId={typeId} params={params} />
    </Suspense>
  );
}

async function History({
  typeId,
  params,
}: {
  typeId: ContentTypeId;
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const found = z.uuid().safeParse(id).success ? await getEntry(id) : null;
  if (!found || found.entry.type !== CONTENT_TYPES[typeId].id) notFound();
  const base = STUDIO[typeId].base;
  const [versions, staff] = await Promise.all([listVersions(id), listStaff()]);
  const names = new Map(staff.map((p) => [p.id, p.name]));
  const { entry } = found;

  return (
    <>
      <PageHeader
        pretitle={<Link href={`${base}/${id}`}>{found.draft.title || "Untitled"}</Link>}
        title="History"
        description="Every save is kept. Restoring one makes it the draft again; publish it to put it live."
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
                  {v.id === entry.publishedVersionId && <Badge tone="success">Live</Badge>}{" "}
                  {v.id === entry.draftVersionId && v.id !== entry.publishedVersionId && (
                    <Badge tone="info">Current draft</Badge>
                  )}
                </td>
                <td>{v.authorId ? (names.get(v.authorId) ?? "Former team member") : "Imported"}</td>
                <td className={`${c.meta} ${c.hideSm}`}>
                  {v.note?.startsWith("Restored from") ? "Restored an earlier version" : v.note}
                </td>
                <td>
                  {v.id !== entry.draftVersionId && (
                    <form action={restoreEntryVersion.bind(null, typeId, id, v.id)}>
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
