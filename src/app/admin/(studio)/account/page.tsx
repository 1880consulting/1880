import { Suspense } from "react";
import { requireStaff } from "@/cms/auth";
import { controls as c, PageHeader, Panel, Skeleton } from "@/cms/ui";
import { PasswordChange } from "./PasswordChange";

export const metadata = { title: "Your account" };

export default function AccountPage() {
  return (
    <>
      <PageHeader pretitle="1880 Studio" title="Your account" />
      <Suspense
        fallback={
          <Panel>
            <Skeleton />
          </Panel>
        }
      >
        <Account />
      </Suspense>
    </>
  );
}

async function Account() {
  const me = await requireStaff();
  return (
    <div className={c.split}>
      <Panel title="Password">
        <PasswordChange email={me.email} />
      </Panel>
      <Panel title="Details">
        <dl className={c.dl}>
          <dt>Name</dt>
          <dd>{me.name}</dd>
          <dt>Email</dt>
          <dd>{me.email}</dd>
          <dt>Role</dt>
          <dd>{me.role === "owner" ? "Owner" : "Editor"}</dd>
        </dl>
        <p className={c.hint} style={{ marginTop: 16 }}>
          To change your name or email, ask an owner.
        </p>
      </Panel>
    </div>
  );
}
