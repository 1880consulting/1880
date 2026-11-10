"use client";

import { useActionState } from "react";
import { Button, controls as c } from "@/cms/ui/client";
import { invitePerson, type InviteState } from "./actions";
import { InviteLink } from "./InviteLink";

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(invitePerson, {
    status: "idle",
  });
  return (
    <form action={action}>
      {state.status === "invited" && state.link && <InviteLink {...state} />}
      {state.status === "error" && (
        <p className={c.error} role="alert" style={{ marginBottom: 16 }}>
          {state.message}
        </p>
      )}
      <div className={c.field}>
        <label htmlFor="invite-name" className={c.label}>
          Name
        </label>
        <input
          id="invite-name"
          name="name"
          className={c.input}
          required
          defaultValue={state.values?.name}
          key={state.status === "invited" ? state.link : "n"}
        />
      </div>
      <div className={c.field}>
        <label htmlFor="invite-email" className={c.label}>
          Work email
        </label>
        <input
          id="invite-email"
          name="email"
          type="email"
          className={c.input}
          required
          defaultValue={state.values?.email}
          key={state.status === "invited" ? state.link + "e" : "e"}
        />
      </div>
      <div className={c.field}>
        <label htmlFor="invite-role" className={c.label}>
          Role
        </label>
        <select
          id="invite-role"
          name="role"
          className={c.input}
          defaultValue={state.values?.role ?? "editor"}
        >
          <option value="editor">Editor: writes and publishes content</option>
          <option value="owner">Owner: also manages people and settings</option>
        </select>
      </div>
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Inviting…" : "Send invite"}
      </Button>
    </form>
  );
}
