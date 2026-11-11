"use client";

import { useActionState } from "react";
import { authStyles as s, Button } from "@/cms/ui/client";
import { setUpFirstOwner, type FormState } from "../actions";
import { Field, FormMessage } from "../fields";

export function SetupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(setUpFirstOwner, {
    status: "idle",
  });
  return (
    <form action={action}>
      <FormMessage {...state} />
      <Field
        label="Setup code"
        name="token"
        type="password"
        autoComplete="off"
        required
        hint="The STUDIO_SETUP_TOKEN value from the host's environment settings."
      />
      <Field label="Your name" name="name" autoComplete="name" required />
      <Field
        label="Work email"
        name="email"
        type="email"
        autoComplete="username"
        required
        defaultValue={state.email}
      />
      <Field
        label="Password"
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
        {pending ? "Setting up…" : "Create owner and sign in"}
      </Button>
    </form>
  );
}
