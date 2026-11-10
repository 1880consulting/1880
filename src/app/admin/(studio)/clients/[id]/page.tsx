import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireStaff } from "@/cms/auth";
import { shortDate } from "@/cms/format";
import { getMedia } from "@/cms/media/store";
import {
  Alert,
  Badge,
  Button,
  buttonClass,
  controls as c,
  PageHeader,
  Panel,
  Skeleton,
} from "@/cms/ui";
import { getTenant, listTenantPeople } from "@/lib/portal/manage";
import { portalOrigin } from "@/lib/portal/origin";
import { listMediaForPicker } from "../../media/actions";
import { changeClientStatus, saveClient } from "../actions";
import { ClientForm } from "../ClientForm";
import { ClientInviteForm } from "../ClientInviteForm";
import { ClientPersonActions } from "../ClientPersonActions";

export const metadata = { title: "Client" };

export default function ClientPage({ params }: PageProps<"/admin/clients/[id]">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader pretitle="Clients" title="Client" />
          <Panel>
            <Skeleton />
          </Panel>
        </>
      }
    >
      <Client params={params} />
    </Suspense>
  );
}

async function Client({ params }: Pick<PageProps<"/admin/clients/[id]">, "params">) {
  await requireStaff();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const tenant = await getTenant(id);
  if (!tenant) notFound();
  const [people, origin, logo] = await Promise.all([
    listTenantPeople(id),
    portalOrigin(),
    tenant.logoMediaId ? getMedia(tenant.logoMediaId) : null,
  ]);
  const archived = tenant.status === "archived";
  const address = `${origin}/${tenant.slug}`;

  return (
    <>
      <PageHeader
        pretitle="Clients"
        title={tenant.name}
        description={address.replace(/^https?:\/\//, "")}
        actions={
          <>
            {!archived && (
              <a
                href={address}
                className={buttonClass("secondary")}
                target="_blank"
                rel="noreferrer"
              >
                Open portal
              </a>
            )}
            <form action={changeClientStatus.bind(null, id, archived ? "active" : "archived")}>
              <Button type="submit" variant="ghost">
                {archived ? "Restore client" : "Archive client"}
              </Button>
            </form>
          </>
        }
      />
      {archived && (
        <div style={{ marginBottom: 24 }}>
          <Alert tone="warning" title="Archived">
            Nobody can open this client in the portal. Restore it to give its people access again.
          </Alert>
        </div>
      )}
      <div className={c.split}>
        <Panel flush title={`People (${people.length})`}>
          {people.length === 0 ? (
            <p className={c.meta} style={{ padding: 20 }}>
              Nobody yet. Invite someone: they get an email with a link that signs them in.
            </p>
          ) : (
            <table className={c.table}>
              <thead>
                <tr>
                  <th scope="col">Person</th>
                  <th scope="col" className={c.hideSm}>
                    Last sign-in
                  </th>
                  <th scope="col">Access</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong style={{ color: "var(--os-ink-strong)" }}>{p.name}</strong>
                      <div className={c.meta}>{p.email}</div>
                    </td>
                    <td className={`${c.meta} ${c.hideSm} ${c.num}`}>
                      {p.lastLoginAt ? (
                        shortDate(p.lastLoginAt)
                      ) : (
                        <Badge tone="info">Invited</Badge>
                      )}
                    </td>
                    <td>
                      <ClientPersonActions
                        tenantId={id}
                        userId={p.id}
                        name={p.name}
                        clientName={tenant.name}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <div style={{ display: "grid", gap: 24, alignContent: "start" }}>
          {!archived && (
            <Panel title="Invite someone">
              <ClientInviteForm tenantId={id} />
            </Panel>
          )}
          <Panel title="Details">
            <ClientForm
              initial={{
                name: tenant.name,
                slug: tenant.slug,
                accentColor: tenant.accentColor,
                logo,
              }}
              portalOrigin={origin}
              action={saveClient.bind(null, id)}
              listMedia={listMediaForPicker}
              submitLabel="Save"
            />
          </Panel>
        </div>
      </div>
    </>
  );
}
