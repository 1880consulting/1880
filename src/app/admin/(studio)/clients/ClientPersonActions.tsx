"use client";

import { useState, useTransition } from "react";
import { Button, controls as c } from "@/cms/ui/client";
import { InviteLink } from "../people/InviteLink";
import { removeClientPerson, resendClientInvite, type InviteState } from "./actions";

export function ClientPersonActions({
  tenantId,
  userId,
  name,
  clientName,
}: {
  tenantId: string;
  userId: string;
  name: string;
  clientName: string;
}) {
  const [pending, start] = useTransition();
  const [invite, setInvite] = useState<InviteState | null>(null);
  return (
    <div>
      <div className={c.actions}>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => start(async () => setInvite(await resendClientInvite(tenantId, userId)))}
        >
          Resend invite
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (
              confirm(
                `Remove ${name}'s access to ${clientName}? They can't see anything here after that.`,
              )
            )
              start(() => removeClientPerson(tenantId, userId));
          }}
        >
          Remove access
        </Button>
      </div>
      {invite?.status === "invited" && (
        <div style={{ marginTop: 8 }}>
          <InviteLink {...invite} />
        </div>
      )}
      {invite?.status === "error" && <p className={c.error}>{invite.message}</p>}
    </div>
  );
}
