"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { authStyles as s, Button } from "@/cms/ui/client";
import { requestSignInLink, signIn, type FormState } from "../actions";
import { Field, FormMessage } from "../fields";

const idle: FormState = { status: "idle" };

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"password" | "link">("password");
  const [pw, pwAction, pwPending] = useActionState(signIn, idle);
  const [link, linkAction, linkPending] = useActionState(requestSignInLink, idle);

  if (mode === "link" && link.status === "sent") {
    return (
      <>
        <p role="status">
          If <strong>{link.email}</strong> has a Studio account, a sign-in link is on its way. It
          works once, for 15 minutes.
        </p>
        <p className={s.below}>
          <button type="button" className={s.linkButton} onClick={() => setMode("password")}>
            Sign in with your password
          </button>
        </p>
      </>
    );
  }

  if (mode === "link") {
    return (
      <form action={linkAction}>
        <FormMessage {...link} />
        <Field
          label="Work email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={link.email ?? pw.email}
        />
        <Button type="submit" variant="primary" className={s.full} disabled={linkPending}>
          {linkPending ? "Sending…" : "Email me a sign-in link"}
        </Button>
        <p className={s.below}>
          <button type="button" className={s.linkButton} onClick={() => setMode("password")}>
            Use your password instead
          </button>
        </p>
      </form>
    );
  }

  return (
    <form action={pwAction}>
      <FormMessage {...pw} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field
        label="Work email"
        name="email"
        type="email"
        autoComplete="username"
        required
        defaultValue={pw.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <Button type="submit" variant="primary" className={s.full} disabled={pwPending}>
        {pwPending ? "Signing in…" : "Sign in"}
      </Button>
      <div className={s.divider}>or</div>
      <Button type="button" className={s.full} onClick={() => setMode("link")}>
        Email me a sign-in link
      </Button>
      <p className={s.below}>
        <Link href="/admin/forgot">Forgot your password?</Link>
      </p>
    </form>
  );
}
