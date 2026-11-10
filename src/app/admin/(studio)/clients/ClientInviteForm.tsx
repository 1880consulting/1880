"use client";

import { useActionState } from "react";
import { Button, controls as c } from "@/cms/ui/client";
import { InviteLink } from "../people/InviteLink";
import { inviteClientPerson, type InviteState } from "./actions";

export function ClientInviteForm({ tenantId }: { tenantId: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(
    inviteClientPerson.bind(null, tenantId),
    { status: "idle" },
  );
  return (
    <form action={action}>
      {state.status === "invited" && state.link && <InviteLink {...state} />}
      {state.status === "error" && (
        <p className={c.error} role="alert" style={{ marginBottom: 16 }}>
          {state.message}
        </p>
      )}
      <div className={c.field}>
        <label htmlFor="client-invite-name" className={c.label}>
          Name
        </label>
        <input
          id="client-invite-name"
          name="name"
          className={c.input}
          required
          defaultValue={state.values?.name}
          key={state.status === "invited" ? state.link : "n"}
        />
      </div>
      <div className={c.field}>
        <label htmlFor="client-invite-email" className={c.label}>
          Email
        </label>
        <input
          id="client-invite-email"
          name="email"
          type="email"
          className={c.input}
          required
          defaultValue={state.values?.email}
          key={state.status === "invited" ? state.link + "e" : "e"}
        />
      </div>
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Inviting…" : "Send invite"}
      </Button>
    </form>
  );
}
