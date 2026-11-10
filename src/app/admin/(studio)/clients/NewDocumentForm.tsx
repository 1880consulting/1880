"use client";

import { useActionState } from "react";
import { Button, controls as c } from "@/cms/ui/client";
import { createDocumentAction, type NewDocumentState } from "./document-actions";

export function NewDocumentForm({ tenantId }: { tenantId: string }) {
  const [state, action, pending] = useActionState<NewDocumentState, FormData>(
    createDocumentAction.bind(null, tenantId),
    { status: "idle" },
  );
  return (
    <form action={action}>
      {state.status === "error" && (
        <p className={c.error} role="alert" style={{ marginBottom: 16 }}>
          {state.message}
        </p>
      )}
      <div className={c.field}>
        <label htmlFor="doc-title" className={c.label}>
          Title
        </label>
        <input id="doc-title" name="title" className={c.input} required maxLength={200} />
      </div>
      <div className={c.field}>
        <label htmlFor="doc-kind" className={c.label}>
          Kind
        </label>
        <select id="doc-kind" name="kind" className={c.input} defaultValue="report">
          <option value="report">Report</option>
          <option value="proposal">Proposal</option>
          <option value="other">Other</option>
        </select>
      </div>
      <fieldset className={c.field} style={{ border: 0, padding: 0, margin: "0 0 16px" }}>
        <legend className={c.label}>Format</legend>
        {[
          ["blocks", "Build it here", "Sections: text, stats, images, video, files, timeline."],
          ["interactive", "Interactive page", "Upload one self-contained .html file."],
          ["file", "File", "Upload a PDF, deck or spreadsheet."],
        ].map(([value, label, hint], i) => (
          <label key={value} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input type="radio" name="format" value={value} defaultChecked={i === 0} />
            <span>
              <strong>{label}</strong>
              <span className={c.meta}> {hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Creating…" : "Create document"}
      </Button>
    </form>
  );
}
