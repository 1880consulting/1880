"use client";

import { useActionState } from "react";
import { Button, controls as c } from "@/cms/ui/client";
import { saveRecipients, type RecipientsState } from "./actions";

export function RecipientsForm({ initial }: { initial: string[] }) {
  const [state, action, pending] = useActionState<RecipientsState, FormData>(saveRecipients, {
    status: "idle",
    value: initial.join("\n"),
  });

  return (
    <form action={action}>
      <div className={c.field}>
        <label htmlFor="recipients" className={c.label}>
          Send new inquiries to
        </label>
        <textarea
          id="recipients"
          name="recipients"
          rows={4}
          className={c.input}
          defaultValue={state.value}
          key={state.value}
          placeholder="name@1880consulting.com"
          aria-invalid={state.status === "invalid" || undefined}
          aria-describedby="recipients-hint recipients-error"
        />
        <p id="recipients-hint" className={c.hint}>
          One address per line. Each new message from the contact form is emailed to everyone here,
          with Reply set to the person who wrote in.
        </p>
        {state.status === "invalid" && (
          <p id="recipients-error" className={c.error} role="alert">
            {state.error}
          </p>
        )}
      </div>
      <div className={c.actions} style={{ alignItems: "center" }}>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {state.status === "saved" && !pending && (
          <span className={c.meta} role="status">
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
