import Link from "next/link";
import { signOutClient } from "@/app/(portal)/portal/actions";
import { Logo } from "@/site/ui/Logo";
import { ActionButton } from "./ActionButton";
import s from "./portal.module.css";

/**
 * The portal's header: the 1880 mark, then (inside a client, after sign-in)
 * the client's logo and name, then the account links.
 */
export function PortalHeader({
  client,
  logo,
  signedIn,
}: {
  client?: { slug: string; name: string; accentColor?: string | null };
  logo?: { src: string; alt: string } | null;
  signedIn: boolean;
}) {
  return (
    <header
      className={s.header}
      style={
        client?.accentColor
          ? ({ "--client-accent": client.accentColor } as React.CSSProperties)
          : undefined
      }
    >
      <div className={s.bar}>
        <Link href="/" className={s.mark} aria-label="1880 client portal, start">
          <Logo label="1880" />
        </Link>
        {client && (
          <Link href={`/${client.slug}`} className={s.client}>
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element -- library image, already sized
              <img className={s.clientLogo} src={logo.src} alt={logo.alt} />
            )}
            <span className={s.clientName}>{client.name}</span>
          </Link>
        )}
        {signedIn && (
          <div className={s.actions}>
            <Link href="/account" className={s.link}>
              Account
            </Link>
            <ActionButton action={signOutClient} look="link">
              Sign out
            </ActionButton>
          </div>
        )}
      </div>
    </header>
  );
}
