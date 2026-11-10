"use client";

import { IconUpload } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { controls as c } from "@/cms/ui/client";

/** Uploads a file for a document (its interactive page, its file, or an attachment). */
export function DocumentUpload({
  documentId,
  purpose,
  accept,
  label,
}: {
  documentId: string;
  purpose: "interactive" | "file" | "attachment";
  accept?: string;
  label: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ busy: boolean; error?: string; done?: string }>({
    busy: false,
  });

  async function upload(file: File) {
    setState({ busy: true });
    const body = new FormData();
    body.append("documentId", documentId);
    body.append("purpose", purpose);
    body.append("file", file);
    try {
      const res = await fetch("/admin/documents/upload", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "That upload failed. Try again.");
      setState({ busy: false, done: `Uploaded ${file.name}.` });
      router.refresh();
    } catch (err) {
      setState({
        busy: false,
        error: err instanceof Error ? err.message : "That upload failed. Try again.",
      });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <label className={c.label} htmlFor={`upload-${purpose}`}>
        {label}
      </label>
      <input
        id={`upload-${purpose}`}
        ref={input}
        type="file"
        className={c.input}
        accept={accept}
        disabled={state.busy}
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <p className={c.meta} role="status" style={{ marginTop: 8 }}>
        {state.busy ? (
          <>
            <IconUpload size={14} stroke={2} aria-hidden /> Uploading…
          </>
        ) : (
          state.done
        )}
      </p>
      {state.error && (
        <p className={c.error} role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
