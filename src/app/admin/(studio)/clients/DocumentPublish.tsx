"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/cms/editor/PageEditor";
import { Badge, Button, controls as c } from "@/cms/ui/client";

/** Publish, unpublish and delete for upload-format documents (the block editor has its own). */
export function DocumentPublish({
  published,
  hasChanges,
  clientName,
  actions,
}: {
  published: boolean;
  hasChanges: boolean;
  clientName: string;
  actions: {
    publish: (opts?: { notify?: boolean }) => Promise<ActionResult>;
    unpublish: () => Promise<ActionResult>;
    remove: () => Promise<ActionResult>;
  };
}) {
  const [pending, start] = useTransition();
  const [notify, setNotify] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string[] } | null>(
    null,
  );
  const [confirming, setConfirming] = useState<null | "unpublish" | "delete">(null);

  const run = (fn: () => Promise<ActionResult>, ok: string) =>
    start(async () => {
      setMessage(null);
      setConfirming(null);
      const r = await fn();
      if (r.ok) setMessage({ tone: "success", text: [ok] });
      else
        setMessage({
          tone: "danger",
          text: [r.message, ...(r.issues ?? []).map((i) => i.message)],
        });
    });

  return (
    <div>
      <p style={{ marginBottom: 12 }}>
        {!published ? (
          <Badge>Draft</Badge>
        ) : hasChanges ? (
          <Badge tone="warning">Live, with unpublished changes</Badge>
        ) : (
          <Badge tone="success">Live</Badge>
        )}
      </p>
      {message && (
        <div
          className={`${c.alert} ${c[message.tone]}`}
          role={message.tone === "danger" ? "alert" : "status"}
          style={{ marginBottom: 12 }}
        >
          <div>
            {message.text.map((t, i) => (
              <p key={i} className={i === 0 ? c.alertTitle : c.alertText}>
                {t}
              </p>
            ))}
          </div>
        </div>
      )}
      <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        Email {clientName}&apos;s people when publishing
      </label>
      <div className={c.actions}>
        <Button
          variant="primary"
          disabled={pending || (published && !hasChanges)}
          onClick={() =>
            run(() => actions.publish({ notify }), `Published. ${clientName} can see it now.`)
          }
        >
          {published ? "Publish changes" : "Publish"}
        </Button>
      </div>
      <div className={c.actions} style={{ marginTop: 16 }}>
        {confirming ? (
          <>
            <span>
              {confirming === "delete"
                ? "Delete this document, its files and its history?"
                : `Take this document away from ${clientName}? The draft is kept.`}
            </span>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                confirming === "delete"
                  ? run(actions.remove, "Deleted.")
                  : run(actions.unpublish, `Unpublished. ${clientName} no longer sees it.`)
              }
            >
              {confirming === "delete" ? "Delete" : "Unpublish"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            {published && (
              <Button size="sm" variant="ghost" onClick={() => setConfirming("unpublish")}>
                Unpublish
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setConfirming("delete")}>
              Delete document
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
