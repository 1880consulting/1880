import { connection } from "next/server";
import { z } from "zod";
import { audit } from "@/cms/audit";
import { currentStaff } from "@/cms/auth";
import { addDocumentFile, DocumentFileError, MAX_DOCUMENT_FILE_MB } from "@/lib/portal/documents";

/**
 * Studio uploads for portal documents: POST a form with `documentId`,
 * `purpose` (interactive | file | attachment) and `file`. Answers JSON.
 *
 * This address skips proxy.ts (see its matcher), so the proxy doesn't buffer
 * large bodies; it checks the session and the request's origin itself.
 */
export async function POST(request: Request) {
  await connection();
  const staff = await currentStaff();
  if (!staff) return json({ error: "Your session ended. Sign in again." }, 401);

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host)
    return json({ error: "Upload refused." }, 403);

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_DOCUMENT_FILE_MB * 1024 * 1024 + 64 * 1024)
    return json({ error: `That file is over ${MAX_DOCUMENT_FILE_MB} MB.` }, 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "That upload didn't arrive complete. Try again." }, 400);
  }
  const parsed = z
    .object({ documentId: z.uuid(), purpose: z.enum(["interactive", "file", "attachment"]) })
    .safeParse({ documentId: form.get("documentId"), purpose: form.get("purpose") });
  const file = form.get("file");
  if (!parsed.success) return json({ error: "Upload refused." }, 400);
  if (!(file instanceof File) || file.size === 0)
    return json({ error: "Choose a file to upload." }, 400);

  try {
    const info = await addDocumentFile(
      parsed.data.documentId,
      parsed.data.purpose,
      { filename: file.name, data: Buffer.from(await file.arrayBuffer()) },
      staff.id,
    );
    await audit({
      actor: { type: "staff", id: staff.id },
      action: "document.file_uploaded",
      target: parsed.data.documentId,
      detail: { fileId: info.id, purpose: parsed.data.purpose, bytes: info.bytes },
    });
    return json({ file: info });
  } catch (err) {
    if (err instanceof DocumentFileError) return json({ error: err.message }, 422);
    console.error("[documents] upload failed", err);
    return json({ error: "That upload failed. Try again." }, 500);
  }
}

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
