"use client";

import { useState } from "react";
import { Button, controls as c } from "@/cms/ui/client";

/** Shows a fresh invite link once, with a Copy button. */
export function InviteLink({
  link,
  emailed,
  name,
}: {
  link?: string;
  emailed?: boolean;
  name?: string;
}) {
  const [copied, setCopied] = useState(false);
  if (!link) return null;
  return (
    <div className={`${c.alert} ${emailed ? c.success : c.info}`} role="status">
      <div style={{ minWidth: 0, flex: 1 }}>
        <p className={c.alertTitle}>
          {emailed ? `Invite emailed to ${name}` : `Invite ready for ${name}`}
        </p>
        <p className={c.alertText}>
          {emailed
            ? "You can also send them this link. It works once, for 7 days."
            : "Email isn't set up yet, so send them this link yourself (for example in Teams). It works once, for 7 days."}
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            className={c.input}
            readOnly
            value={link}
            aria-label="Invite link"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(link).catch(() => {});
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
    </div>
  );
}
