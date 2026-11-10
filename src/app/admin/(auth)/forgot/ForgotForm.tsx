"use client";

import Link from "next/link";
import { useActionState } from "react";
import { authStyles as s, Button } from "@/cms/ui/client";
import { requestPasswordReset, type FormState } from "../actions";
import { Field, FormMessage } from "../fields";

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordReset, {
    status: "idle",
  });
  if (state.status === "sent") {
    return (
      <>
        <p role="status">
          If <strong>{state.email}</strong> has a Studio account, a reset link is on its way. It
          works once, for 60 minutes.
        </p>
        <p className={s.below}>
          <Link href="/admin/login">Back to sign in</Link>
        </p>
      </>
    );
  }
  return (
    <form action={action}>
      <FormMessage {...state} />
      <Field
        label="Work email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.email}
      />
      <Button type="submit" variant="primary" className={s.full} disabled={pending}>
        {pending ? "Sending…" : "Email me a reset link"}
      </Button>
      <p className={s.below}>
        <Link href="/admin/login">Back to sign in</Link>
      </p>
    </form>
  );
}
