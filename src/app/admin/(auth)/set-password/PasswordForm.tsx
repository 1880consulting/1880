"use client";

import { useActionState } from "react";
import { authStyles as s, Button } from "@/cms/ui/client";
import { choosePassword, type FormState } from "../actions";
import { Field, FormMessage } from "../fields";

export function PasswordForm({ token, email, cta }: { token: string; email: string; cta: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(choosePassword, {
    status: "idle",
  });
  return (
    <form action={action}>
      <FormMessage {...state} />
      <input type="hidden" name="token" value={token} />
      {/* Lets password managers save the new password against the right account. */}
      <input type="hidden" name="username" autoComplete="username" value={email} readOnly />
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
        hint="At least 12 characters. A short sentence works well."
      />
      <Field
        label="Type it again"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
      />
      <Button type="submit" variant="primary" className={s.full} disabled={pending}>
        {pending ? "Saving…" : cta}
      </Button>
    </form>
  );
}
