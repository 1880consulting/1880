"use client";

import { useActionState } from "react";
import { Button, controls as c } from "@/cms/ui/client";
import type { DetailsState } from "./document-actions";

/** Title, kind and summary for upload-format documents. */
export function DocumentDetailsForm({
  initial,
  action,
}: {
  initial: { title: string; summary: string; kind: string };
  action: (prev: DetailsState, form: FormData) => Promise<DetailsState>;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return (
    <form action={formAction}>
      {state.status === "error" && (
        <p className={c.error} role="alert" style={{ marginBottom: 12 }}>
          {state.message}
        </p>
      )}
      {state.status === "saved" && (
        <p className={c.meta} role="status" style={{ marginBottom: 12 }}>
          Saved to the draft. Publish to show it to the client.
        </p>
      )}
      <div className={c.field}>
        <label htmlFor="d-title" className={c.label}>
          Title
        </label>
        <input
          id="d-title"
          name="title"
          className={c.input}
          defaultValue={initial.title}
          required
        />
      </div>
      <div className={c.field}>
        <label htmlFor="d-kind" className={c.label}>
          Kind
        </label>
        <select id="d-kind" name="kind" className={c.input} defaultValue={initial.kind}>
          <option value="report">Report</option>
          <option value="proposal">Proposal</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className={c.field}>
        <label htmlFor="d-summary" className={c.label}>
          Summary <span className={c.meta}>Optional. Shown in the client&apos;s list</span>
        </label>
        <textarea
          id="d-summary"
          name="summary"
          rows={3}
          maxLength={240}
          className={c.input}
          defaultValue={initial.summary}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save details"}
      </Button>
    </form>
  );
}
