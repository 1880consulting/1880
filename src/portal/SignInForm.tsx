"use client";

import { useActionState } from "react";
import { requestClientLink, type LinkFormState } from "@/app/(portal)/portal/actions";
import { Button } from "@/site/ui/Button";
import s from "./portal.module.css";

/** Email → "Check your email". Says the same thing whether or not the address has access. */
export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LinkFormState, FormData>(requestClientLink, {
    status: "idle",
  });

  if (state.status === "sent") {
    return (
      <div role="status">
        <h2 className={s.title} style={{ fontSize: 32 }}>
          Check your email
        </h2>
        <p className={s.lead}>
          If {state.email} has access to a client area, a sign-in link is on its way. It works once,
          for 15 minutes.
        </p>
        <p className={s.small}>
          Nothing arrived? Check your junk folder, or ask your 1880 contact to make sure they
          invited this address.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className={s.form} noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="email" className={s.fieldLabel}>
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          className={s.input}
          defaultValue={state.email}
          aria-invalid={state.status === "error" ? true : undefined}
          aria-describedby={state.status === "error" ? "email-error" : undefined}
        />
      </div>
      {state.status === "error" && (
        <p id="email-error" className={s.error} role="alert">
          {state.message}
        </p>
      )}
      <Button type="submit" arrow disabled={pending}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
