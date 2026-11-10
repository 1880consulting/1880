import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { clientAreasFor } from "@/lib/portal/access";
import { currentClientUser, safePortalNext } from "@/lib/portal/auth";
import { clientLogo } from "@/lib/portal/branding";
import { Frame } from "@/portal/Frame";
import { SignInForm } from "@/portal/SignInForm";
import s from "@/portal/portal.module.css";

export const metadata = { title: "Sign in" };

/**
 * hub.1880.io/: sign in, or, once signed in, straight to your client (or a
 * choice of clients if you belong to several). Shows no client names or logos
 * before sign-in.
 */
export default function PortalStartPage({ searchParams }: PageProps<"/portal">) {
  return (
    <Suspense fallback={<Frame signedIn={false}>{null}</Frame>}>
      <Start searchParams={searchParams} />
    </Suspense>
  );
}

async function Start({ searchParams }: Pick<PageProps<"/portal">, "searchParams">) {
  const user = await currentClientUser();
  const { next } = await searchParams;
  const after = safePortalNext(next);

  if (!user) {
    return (
      <Frame signedIn={false}>
        <div className={s.narrow}>
          <p className={s.label}>Client portal</p>
          <h1 className={s.title}>Sign in</h1>
          <p className={s.lead}>
            Enter the email address 1880 invited. We&apos;ll send you a link to sign in. No password
            needed.
          </p>
          <SignInForm next={after !== "/" ? after : undefined} />
        </div>
      </Frame>
    );
  }

  if (after !== "/") redirect(after);
  const clients = await clientAreasFor(user.id);
  if (clients.length === 1) redirect(`/${clients[0].slug}`);

  const logos = await Promise.all(clients.map((c) => clientLogo(c, 120)));
  return (
    <Frame signedIn>
      <div className={s.narrow} style={{ maxWidth: "40rem" }}>
        <p className={s.label}>Client portal</p>
        <h1 className={s.title}>Hello, {user.name.split(" ")[0]}</h1>
        {clients.length === 0 ? (
          <>
            <p className={s.lead}>
              Your access to client areas has ended. If that&apos;s a surprise, ask your 1880
              contact.
            </p>
          </>
        ) : (
          <>
            <p className={s.lead}>Choose a client.</p>
            <ul className={s.list}>
              {clients.map((c, i) => (
                <li key={c.id}>
                  <Link href={`/${c.slug}`} className={s.row}>
                    {logos[i] && (
                      // eslint-disable-next-line @next/next/no-img-element -- library image
                      <img className={s.rowLogo} src={logos[i].src} alt="" />
                    )}
                    <span className={s.rowTitle}>{c.name}</span>
                    <span className={s.rowArrow} aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Frame>
  );
}
