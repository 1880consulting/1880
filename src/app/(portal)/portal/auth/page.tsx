import { connection } from "next/server";
import { Suspense } from "react";
import { safePortalNext } from "@/lib/portal/auth";
import { peekClientToken } from "@/lib/portal/users";
import { Frame } from "@/portal/Frame";
import { SignInForm } from "@/portal/SignInForm";
import s from "@/portal/portal.module.css";
import { ActionButton } from "@/portal/ActionButton";
import { confirmClientLink } from "../actions";

export const metadata = { title: "Sign in" };

/**
 * Where an emailed sign-in link lands. It asks for one click before using the
 * link, because email security scanners open links automatically and would
 * otherwise use them up.
 */
export default function AuthPage({ searchParams }: PageProps<"/portal/auth">) {
  return (
    <Suspense fallback={<Frame signedIn={false}>{null}</Frame>}>
      <Confirm searchParams={searchParams} />
    </Suspense>
  );
}

async function Confirm({ searchParams }: Pick<PageProps<"/portal/auth">, "searchParams">) {
  await connection(); // one-time links: check them only for a real visit
  const { token, next } = await searchParams;
  const user = typeof token === "string" ? await peekClientToken(token) : null;

  if (!user) {
    return (
      <Frame signedIn={false}>
        <div className={s.narrow}>
          <p className={s.label}>Client portal</p>
          <h1 className={s.title}>This link has expired</h1>
          <p className={s.lead}>
            Sign-in links work once, for a limited time. Enter your email and we&apos;ll send a new
            one.
          </p>
          <SignInForm />
        </div>
      </Frame>
    );
  }

  return (
    <Frame signedIn={false}>
      <div className={s.narrow}>
        <p className={s.label}>Client portal</p>
        <h1 className={s.title}>Welcome, {user.name.split(" ")[0]}</h1>
        <p className={s.lead}>Signing in as {user.email}.</p>
        <ActionButton
          action={confirmClientLink.bind(null, token as string, safePortalNext(next))}
          arrow
        >
          Continue
        </ActionButton>
      </div>
    </Frame>
  );
}
