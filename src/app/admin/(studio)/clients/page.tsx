import Link from "next/link";
import { Suspense } from "react";
import { requireStaff } from "@/cms/auth";
import { Badge, controls as c, EmptyState, PageHeader, Panel, Skeleton } from "@/cms/ui";
import { listTenants } from "@/lib/portal/manage";
import { portalOrigin } from "@/lib/portal/origin";
import { listMediaForPicker } from "../media/actions";
import { SECTIONS } from "../sections";
import { createClient } from "./actions";
import { ClientForm } from "./ClientForm";

export const metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <>
      <PageHeader
        pretitle="Client portal"
        title="Clients"
        description="Each client has a private area in the portal. Only the people you invite can see it."
      />
      <Suspense
        fallback={
          <Panel>
            <Skeleton />
          </Panel>
        }
      >
        <Clients />
      </Suspense>
    </>
  );
}

async function Clients() {
  await requireStaff();
  const [clients, origin] = await Promise.all([listTenants(), portalOrigin()]);
  return (
    <div className={c.split}>
      {clients.length === 0 ? (
        <EmptyState
          icon={SECTIONS.clients.icon}
          title="No clients yet"
          text="Add your first client, then invite their people."
        />
      ) : (
        <Panel flush title="All clients">
          <table className={c.table}>
            <thead>
              <tr>
                <th scope="col">Client</th>
                <th scope="col" className={c.hideSm}>
                  People
                </th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/admin/clients/${t.id}`} style={{ fontWeight: 600 }}>
                      {t.name}
                    </Link>
                    <div className={c.meta}>
                      {origin.replace(/^https?:\/\//, "")}/{t.slug}
                    </div>
                  </td>
                  <td className={`${c.hideSm} ${c.num}`}>{t.people}</td>
                  <td>
                    {t.status === "active" ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge>Archived</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
      <Panel title="Add a client">
        <ClientForm
          portalOrigin={origin}
          action={createClient}
          listMedia={listMediaForPicker}
          submitLabel="Add client"
        />
      </Panel>
    </div>
  );
}
