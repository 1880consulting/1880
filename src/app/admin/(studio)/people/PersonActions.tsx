"use client";

import { useActionState } from "react";
import { Button, controls as c } from "@/cms/ui/client";
import { resendInvite, updateAccess, updateRole, type InviteState, type RowState } from "./actions";
import { InviteLink } from "./InviteLink";

export function PersonActions({
  userId,
  role,
  status,
  isYou,
}: {
  userId: string;
  role: "owner" | "editor";
  status: "invited" | "active" | "disabled";
  isYou: boolean;
}) {
  const [roleState, roleAction, rolePending] = useActionState<RowState, FormData>(
    updateRole.bind(null, userId),
    {
      status: "idle",
    },
  );
  const [accessState, accessAction, accessPending] = useActionState<RowState>(
    updateAccess.bind(null, userId, status === "disabled" ? "restore" : "disabled"),
    { status: "idle" },
  );
  const [invite, inviteAction, invitePending] = useActionState<InviteState, FormData>(
    resendInvite,
    {
      status: "idle",
    },
  );
  const error = [roleState, accessState, invite].find((s) => s.status === "error")?.message;

  return (
    <div>
      <div className={c.actions} style={{ alignItems: "center" }}>
        {status !== "disabled" && (
          <form action={roleAction}>
            <label className="visually-hidden" htmlFor={`role-${userId}`}>
              Role
            </label>
            <select
              id={`role-${userId}`}
              name="role"
              defaultValue={role}
              key={role}
              className={c.input}
              style={{ width: "auto", height: 32, paddingBlock: 0 }}
              disabled={rolePending}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
            >
              <option value="editor">Editor</option>
              <option value="owner">Owner</option>
            </select>
          </form>
        )}
        {status === "invited" && (
          <form action={inviteAction}>
            <input type="hidden" name="userId" value={userId} />
            <Button type="submit" size="sm" variant="ghost" disabled={invitePending}>
              New invite link
            </Button>
          </form>
        )}
        {!isYou && (
          <form action={accessAction}>
            <Button type="submit" size="sm" variant="ghost" disabled={accessPending}>
              {status === "disabled" ? "Restore access" : "Remove access"}
            </Button>
          </form>
        )}
      </div>
      {error && (
        <p className={c.error} role="alert" style={{ marginTop: 8 }}>
          {error}
        </p>
      )}
      {invite.status === "invited" && (
        <div style={{ marginTop: 8 }}>
          <InviteLink {...invite} />
        </div>
      )}
    </div>
  );
}
