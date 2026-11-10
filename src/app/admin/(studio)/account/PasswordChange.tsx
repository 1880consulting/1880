"use client";

import { useActionState } from "react";
import { Button, controls as c } from "@/cms/ui/client";
import { changePassword, type PasswordState } from "./actions";

const fields = [
  { name: "current", label: "Current password", auto: "current-password" },
  {
    name: "password",
    label: "New password",
    auto: "new-password",
    hint: "At least 12 characters. A short sentence works well.",
  },
  { name: "confirm", label: "Type the new password again", auto: "new-password" },
];

export function PasswordChange({ email }: { email: string }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, {
    status: "idle",
  });
  return (
    <form action={action} key={state.status === "saved" ? "saved" : "form"}>
      <input type="hidden" name="username" autoComplete="username" value={email} readOnly />
      {fields.map((f) => (
        <div key={f.name} className={c.field}>
          <label htmlFor={`pw-${f.name}`} className={c.label}>
            {f.label}
          </label>
          <input
            id={`pw-${f.name}`}
            name={f.name}
            type="password"
            autoComplete={f.auto}
            required
            className={c.input}
          />
          {f.hint && <p className={c.hint}>{f.hint}</p>}
        </div>
      ))}
      <div className={c.actions} style={{ alignItems: "center" }}>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : "Change password"}
        </Button>
        {state.message && (
          <span
            className={state.status === "error" ? c.error : c.meta}
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
