"use client";

import { useState, useTransition } from "react";
import { Button, controls as c } from "@/cms/ui/client";

export function AttachmentDelete({
  action,
}: {
  action: () => Promise<{ ok: boolean; message?: string }>;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await action();
            setError(r.ok ? undefined : r.message);
          })
        }
      >
        Delete
      </Button>
      {error && <p className={c.error}>{error}</p>}
    </>
  );
}
