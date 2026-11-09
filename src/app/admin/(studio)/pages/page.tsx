import { IconFileText } from "@tabler/icons-react";
import { Suspense } from "react";
import { requireStaff } from "@/cms/auth";
import { listEntries } from "@/cms/content/store";
import { shortDate } from "@/cms/format";
import { Badge, controls as c, EmptyState, PageHeader, Panel, Skeleton } from "@/cms/ui";
import { pageType } from "@/site/cms";
import { NewPageForm } from "./NewPageForm";

export const metadata = { title: "Pages" };

export default function PagesPage() {
  return (
    <>
      <PageHeader
        pretitle="1880 Studio"
        title="Pages"
        description="Build pages from sections, preview them, and publish when they're ready."
      />
      <Suspense
        fallback={
          <Panel>
            <Skeleton />
          </Panel>
        }
      >
        <Pages />
      </Suspense>
    </>
  );
}

async function Pages() {
  await requireStaff();
  const pages = await listEntries(pageType.id);
  return (
    <div className={c.split}>
      {pages.length === 0 ? (
        <EmptyState
          icon={<IconFileText size={24} stroke={2} aria-hidden />}
          title="No pages yet"
          text="Create the first one with the form beside this."
        />
      ) : (
        <Panel flush>
          <table className={c.table}>
            <thead>
              <tr>
                <th scope="col">Page</th>
                <th scope="col">Status</th>
                <th scope="col" className={c.hideSm}>
                  Last edited
                </th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id}>
                  <td>
                    <a className={c.rowLink} href={`/admin/pages/${p.id}`}>
                      {p.title}
                    </a>
                    <div className={c.meta}>{pageType.path(p.slug)}</div>
                  </td>
                  <td>
                    {p.status !== "published" ? (
                      <Badge>Draft</Badge>
                    ) : p.hasChanges ? (
                      <Badge tone="warning">Unpublished changes</Badge>
                    ) : (
                      <Badge tone="success">Live</Badge>
                    )}
                  </td>
                  <td className={`${c.meta} ${c.hideSm} ${c.num}`}>{shortDate(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
      <Panel title="New page">
        <NewPageForm addressPrefix="1880.io/" />
      </Panel>
    </div>
  );
}
