import { IconLock } from "@tabler/icons-react";
import { Suspense } from "react";
import { requireStaff } from "@/cms/auth";
import { shortDate } from "@/cms/format";
import { listStaff } from "@/cms/staff/service";
import { Badge, controls as c, EmptyState, PageHeader, Panel, Skeleton } from "@/cms/ui";
import { InviteForm } from "./InviteForm";
import { PersonActions } from "./PersonActions";

export const metadata = { title: "People" };

export default function PeoplePage() {
  return (
    <>
      <PageHeader
        pretitle="1880 Studio"
        title="People"
        description="Who can sign in to 1880 Studio, and what they can do."
      />
      <Suspense
        fallback={
          <Panel>
            <Skeleton />
          </Panel>
        }
      >
        <People />
      </Suspense>
    </>
  );
}

const STATUS = {
  active: <Badge tone="success">Active</Badge>,
  invited: <Badge tone="info">Invited</Badge>,
  disabled: <Badge>No access</Badge>,
};

async function People() {
  const me = await requireStaff();
  if (me.role !== "owner") {
    return (
      <EmptyState
        icon={<IconLock size={24} stroke={2} aria-hidden />}
        title="Only owners manage people"
        text="Ask an owner if someone needs access to 1880 Studio."
      />
    );
  }
  const people = await listStaff();
  return (
    <div className={c.split}>
      <Panel flush title="Team">
        <table className={c.table}>
          <thead>
            <tr>
              <th scope="col">Person</th>
              <th scope="col" className={c.hideSm}>
                Status
              </th>
              <th scope="col" className={c.hideSm}>
                Last sign-in
              </th>
              <th scope="col">Role and access</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong style={{ color: "var(--os-ink-strong)" }}>{p.name}</strong>
                  {p.id === me.id && <span className={c.meta}> (you)</span>}
                  <div className={c.meta}>{p.email}</div>
                </td>
                <td className={c.hideSm}>{STATUS[p.status]}</td>
                <td className={`${c.meta} ${c.hideSm} ${c.num}`}>
                  {p.lastLoginAt ? shortDate(p.lastLoginAt) : "Never"}
                </td>
                <td>
                  <PersonActions
                    userId={p.id}
                    role={p.role}
                    status={p.status}
                    isYou={p.id === me.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel title="Invite someone">
        <InviteForm />
      </Panel>
    </div>
  );
}
