import { IconFileText } from "@tabler/icons-react";
import { Suspense } from "react";
import { requireStaff } from "@/cms/auth";
import { listEntries } from "@/cms/content/store";
import { shortDate } from "@/cms/format";
import { Badge, controls as c, EmptyState, PageHeader, Panel, Skeleton } from "@/cms/ui";
import { CONTENT_TYPES, type ContentTypeId } from "@/site/cms";
import { STUDIO } from "./config";
import { NewEntryForm } from "./NewEntryForm";

/** Studio's list of a content type's entries, with a form to start a new one. */
export function EntryListPage({ typeId }: { typeId: ContentTypeId }) {
  const type = CONTENT_TYPES[typeId];
  return (
    <>
      <PageHeader
        pretitle="1880 Studio"
        title={type.plural}
        description={STUDIO[typeId].description}
      />
      <Suspense
        fallback={
          <Panel>
            <Skeleton />
          </Panel>
        }
      >
        <List typeId={typeId} />
      </Suspense>
    </>
  );
}

async function List({ typeId }: { typeId: ContentTypeId }) {
  await requireStaff();
  const type = CONTENT_TYPES[typeId];
  const cfg = STUDIO[typeId];
  const entries = await listEntries(type.id);
  return (
    <div className={c.split}>
      {entries.length === 0 ? (
        <EmptyState
          icon={<IconFileText size={24} stroke={2} aria-hidden />}
          title={`No ${type.plural.toLowerCase()} yet`}
          text="Create the first one with the form beside this."
        />
      ) : (
        <Panel flush>
          <table className={c.table}>
            <thead>
              <tr>
                <th scope="col">{type.label}</th>
                <th scope="col">Status</th>
                <th scope="col" className={c.hideSm}>
                  Last edited
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>
                    <a className={c.rowLink} href={`${cfg.base}/${e.id}`}>
                      {e.title}
                    </a>
                    <div className={c.meta}>{type.path(e.slug)}</div>
                  </td>
                  <td>
                    {e.status !== "published" ? (
                      <Badge>Draft</Badge>
                    ) : e.hasChanges ? (
                      <Badge tone="warning">Unpublished changes</Badge>
                    ) : (
                      <Badge tone="success">Live</Badge>
                    )}
                  </td>
                  <td className={`${c.meta} ${c.hideSm} ${c.num}`}>{shortDate(e.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
      <Panel title={`New ${cfg.singular}`}>
        <NewEntryForm
          typeId={typeId}
          addressPrefix={cfg.addressPrefix}
          cta={`Create ${cfg.singular}`}
        />
      </Panel>
    </div>
  );
}
