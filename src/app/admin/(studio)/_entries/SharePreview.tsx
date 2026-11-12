"use client";

import { IconLink, IconShare } from "@tabler/icons-react";
import { useState, useTransition } from "react";
import { Button, buttonClass, controls as c } from "@/cms/ui/client";
import type { PreviewLinkView } from "./actions";

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/**
 * "Share preview": expiring links to this entry's draft for someone without a
 * Studio account (PLAN D50). A link shows the draft as it is when opened.
 */
export function SharePreview({
  initial,
  create,
  revoke,
}: {
  initial: PreviewLinkView[];
  create: () => Promise<PreviewLinkView>;
  revoke: (id: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState(initial);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const fresh = links.find((l) => l.url);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className={buttonClass("ghost")}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <IconShare size={18} stroke={2} aria-hidden />
        Share preview
      </button>
      {open && (
        <div className={c.popover} role="dialog" aria-label="Share a preview">
          <p className={c.alertTitle} style={{ marginTop: 0 }}>
            Share the draft
          </p>
          <p className={c.meta} style={{ marginTop: 0 }}>
            Anyone with the link sees this page&apos;s current draft for 7 days, until you turn the
            link off. It isn&apos;t listed anywhere or shown to search engines.
          </p>
          {fresh?.url && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                className={c.input}
                readOnly
                value={fresh.url}
                aria-label="Preview link"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(fresh.url!).catch(() => {});
                  setCopied(true);
                }}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          )}
          <Button
            variant="primary"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const link = await create();
                setCopied(false);
                setLinks((ls) => [link, ...ls.map((l) => ({ ...l, url: undefined }))]);
              })
            }
          >
            <IconLink size={16} stroke={2} aria-hidden />
            {links.length ? "Create another link" : "Create link"}
          </Button>
          {links.length > 0 && (
            <ul className={c.feed} style={{ marginTop: 16 }}>
              {links.map((l) => (
                <li key={l.id}>
                  <span className={c.meta}>
                    Made {when(l.createdAt)} · works until {when(l.expiresAt)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        if (await revoke(l.id)) setLinks((ls) => ls.filter((x) => x.id !== l.id));
                      })
                    }
                  >
                    Turn off
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
