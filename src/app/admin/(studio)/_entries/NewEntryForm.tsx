"use client";

import { useActionState, useState } from "react";
import { slugify } from "@/cms/content/types";
import { Button, controls as c } from "@/cms/ui/client";
import { createEntryAction, type NewEntryState } from "./actions";

export function NewEntryForm({
  typeId,
  addressPrefix,
  cta,
}: {
  typeId: string;
  addressPrefix: string;
  cta: string;
}) {
  const [state, action, pending] = useActionState<NewEntryState, FormData>(
    createEntryAction.bind(null, typeId),
    {
      status: "idle",
    },
  );
  const [title, setTitle] = useState(state.values?.title ?? "");
  const [slug, setSlug] = useState<string | null>(state.values?.slug ?? null);
  const shown = slug ?? slugify(title);

  return (
    <form action={action}>
      {state.status === "error" && (
        <p className={c.error} role="alert" style={{ marginBottom: 12 }}>
          {state.message}
        </p>
      )}
      <div className={c.field}>
        <label htmlFor="new-title" className={c.label}>
          Title
        </label>
        <input
          id="new-title"
          name="title"
          className={c.input}
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className={c.field}>
        <label htmlFor="new-slug" className={c.label}>
          Address
        </label>
        <input
          id="new-slug"
          name="slug"
          className={c.input}
          maxLength={80}
          value={shown}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
          aria-describedby="new-slug-hint"
        />
        <p id="new-slug-hint" className={c.hint}>
          {addressPrefix}
          {shown || "…"}
        </p>
      </div>
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Creating…" : cta}
      </Button>
    </form>
  );
}
