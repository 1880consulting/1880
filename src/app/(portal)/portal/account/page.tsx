import Link from "next/link";
import { Suspense } from "react";
import { clientAreasFor } from "@/lib/portal/access";
import { requireClientUser } from "@/lib/portal/auth";
import { Frame } from "@/portal/Frame";
import s from "@/portal/portal.module.css";
import { ActionButton } from "@/portal/ActionButton";
import { signOutClient } from "../actions";

export const metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <Suspense fallback={<Frame signedIn>{null}</Frame>}>
      <Account />
    </Suspense>
  );
}

async function Account() {
  const user = await requireClientUser();
  const clients = await clientAreasFor(user.id);
  return (
    <Frame signedIn>
      <div className={s.narrow} style={{ maxWidth: "40rem" }}>
        <p className={s.label}>Account</p>
        <h1 className={s.title}>{user.name}</h1>
        <dl className={s.facts}>
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>Clients</dt>
          <dd>
            {clients.length
              ? clients.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 && ", "}
                    <Link href={`/${c.slug}`} className={s.link}>
                      {c.name}
                    </Link>
                  </span>
                ))
              : "None"}
          </dd>
        </dl>
        <p className={s.small} style={{ marginBottom: 32 }}>
          To change your name or email, or to give a colleague access, ask your 1880 contact.
        </p>
        <ActionButton action={signOutClient} variant="ghost">
          Sign out
        </ActionButton>
      </div>
    </Frame>
  );
}
