"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/cms/audit";
import { requireStaff } from "@/cms/auth";
import { docSchema } from "@/cms/content/types";
import type { ActionResult, DiscardResult, SaveResult } from "@/cms/editor/PageEditor";
import { sendMail } from "@/cms/mail";
import {
  clientRecipients,
  createDocument,
  deleteAttachment,
  deleteDocument,
  discardDocumentChanges,
  DocumentConflictError,
  getDocument,
  KIND_LABELS,
  publishDocument,
  restoreDocumentVersion,
  saveDocumentDetails,
  saveDocumentDraft,
  setDocumentKind,
  unpublishDocument,
} from "@/lib/portal/documents";
import { newDocumentEmail } from "@/lib/portal/emails";
import { getTenant } from "@/lib/portal/manage";
import { portalOrigin } from "@/lib/portal/origin";

/** 1880 Studio: a client's reports, proposals and other documents (PLAN §3.4, §3.5). */

const id = z.uuid();
const kind = z.enum(["report", "proposal", "other"]);

export interface NewDocumentState {
  status: "idle" | "error";
  message?: string;
}

export async function createDocumentAction(
  tenantId: string,
  _prev: NewDocumentState,
  form: FormData,
): Promise<NewDocumentState> {
  const staff = await requireStaff();
  const tid = id.parse(tenantId);
  const parsed = z
    .object({
      title: z.string().trim().min(1, "Give it a title.").max(200),
      kind,
      format: z.enum(["blocks", "interactive", "file"]),
    })
    .safeParse({
      title: String(form.get("title") ?? ""),
      kind: form.get("kind"),
      format: form.get("format"),
    });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  if (!(await getTenant(tid))) return { status: "error", message: "That client no longer exists." };
  const docId = await createDocument({ tenantId: tid, ...parsed.data, authorId: staff.id });
  await audit({
    actor: { type: "staff", id: staff.id },
    action: "document.created",
    target: docId,
    tenantId: tid,
  });
  redirect(`/admin/clients/${tid}/documents/${docId}`);
}

/** The document, checked to belong to this client (so a URL can't mix clients up). */
async function ownDocument(tenantId: string, documentId: string) {
  const found = await getDocument(id.parse(documentId));
  if (!found || found.document.tenantId !== id.parse(tenantId))
    throw new Error("That document no longer exists.");
  return found;
}

const failure = (err: unknown): { ok: false; message: string; conflict?: boolean } => {
  if (err instanceof DocumentConflictError)
    return { ok: false, message: err.message, conflict: true };
  if (err instanceof Error) return { ok: false, message: err.message };
  return { ok: false, message: "That didn't work. Try again." };
};

const saveInput = z.object({
  doc: docSchema,
  baseVersionId: z.uuid().nullable(),
  autosave: z.boolean().optional(),
});

export async function saveDocumentAction(
  tenantId: string,
  documentId: string,
  input: unknown,
): Promise<SaveResult> {
  const staff = await requireStaff();
  const parsed = saveInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "That couldn't be saved. Reload the page and try again." };
  try {
    await ownDocument(tenantId, documentId);
    const versionId = await saveDocumentDraft(
      documentId,
      parsed.data.doc,
      parsed.data.baseVersionId,
      staff.id,
      { autosave: parsed.data.autosave },
    );
    return { ok: true, versionId };
  } catch (err) {
    return failure(err);
  }
}

export async function publishDocumentAction(
  tenantId: string,
  documentId: string,
  opts?: { notify?: boolean },
): Promise<ActionResult> {
  const staff = await requireStaff();
  try {
    const { document } = await ownDocument(tenantId, documentId);
    const result = await publishDocument(document.id);
    if (!result.ok)
      return {
        ok: false,
        message: "Fix the items below, then publish again.",
        issues: result.issues,
      };
    let emailed = 0;
    if (opts?.notify === true) emailed = await notifyClient(document.tenantId, document.id);
    await audit({
      actor: { type: "staff", id: staff.id },
      action: "document.published",
      target: document.id,
      tenantId: document.tenantId,
      detail: opts?.notify ? { emailed } : undefined,
    });
    refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

/** Emails each of the client's people (one email each, so nobody sees the others' addresses). */
async function notifyClient(tenantId: string, documentId: string): Promise<number> {
  const [tenant, found, people, origin] = await Promise.all([
    getTenant(tenantId),
    getDocument(documentId),
    clientRecipients(tenantId),
    portalOrigin(),
  ]);
  if (!tenant || !found?.published) return 0;
  let sent = 0;
  for (const p of people) {
    const mail = newDocumentEmail({
      name: p.name,
      clientName: tenant.name,
      title: found.published.title,
      kindLabel: KIND_LABELS[found.document.kind],
      link: `${origin}/${tenant.slug}/d/${documentId}`,
    });
    const r = await sendMail({ to: [p.email], ...mail });
    if (r.ok) sent++;
    else if (process.env.NODE_ENV === "development")
      console.info(`\n[portal] ${mail.subject} for ${p.email}:\n${mail.text}\n`);
  }
  return sent;
}

export async function unpublishDocumentAction(
  tenantId: string,
  documentId: string,
): Promise<ActionResult> {
  const staff = await requireStaff();
  try {
    const { document } = await ownDocument(tenantId, documentId);
    await unpublishDocument(document.id);
    await audit({
      actor: { type: "staff", id: staff.id },
      action: "document.unpublished",
      target: document.id,
      tenantId: document.tenantId,
    });
    refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export async function discardDocumentAction(
  tenantId: string,
  documentId: string,
): Promise<DiscardResult> {
  await requireStaff();
  try {
    await ownDocument(tenantId, documentId);
    const versionId = await discardDocumentChanges(documentId);
    const found = await getDocument(documentId);
    if (!versionId || !found) return { ok: false, message: "There's nothing live to go back to." };
    return { ok: true, doc: found.draft, slug: "", versionId };
  } catch (err) {
    return failure(err);
  }
}

export async function deleteDocumentAction(
  tenantId: string,
  documentId: string,
): Promise<ActionResult> {
  const staff = await requireStaff();
  try {
    const { document } = await ownDocument(tenantId, documentId);
    await deleteDocument(document.id);
    await audit({
      actor: { type: "staff", id: staff.id },
      action: "document.deleted",
      target: document.id,
      tenantId: document.tenantId,
    });
  } catch (err) {
    return failure(err);
  }
  redirect(`/admin/clients/${tenantId}`);
}

// ---- Upload formats (interactive page, file) and shared bits ----

export interface DetailsState {
  status: "idle" | "error" | "saved";
  message?: string;
}

export async function saveDocumentDetailsAction(
  tenantId: string,
  documentId: string,
  _prev: DetailsState,
  form: FormData,
): Promise<DetailsState> {
  const staff = await requireStaff();
  const parsed = z
    .object({
      title: z.string().trim().min(1, "Give it a title.").max(200),
      summary: z.string().trim().max(240, "Keep the summary to 240 characters or fewer."),
      kind,
    })
    .safeParse({
      title: String(form.get("title") ?? ""),
      summary: String(form.get("summary") ?? ""),
      kind: form.get("kind"),
    });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  try {
    await ownDocument(tenantId, documentId);
    await saveDocumentDetails(documentId, parsed.data, staff.id);
    await setDocumentKind(documentId, parsed.data.kind);
  } catch (err) {
    return { status: "error", message: failure(err).message };
  }
  refresh();
  return { status: "saved" };
}

export async function setDocumentKindAction(tenantId: string, documentId: string, value: string) {
  await requireStaff();
  await ownDocument(tenantId, documentId);
  await setDocumentKind(documentId, kind.parse(value));
  refresh();
}

export async function deleteAttachmentAction(
  tenantId: string,
  documentId: string,
  fileId: string,
): Promise<{ ok: boolean; message?: string }> {
  const staff = await requireStaff();
  await ownDocument(tenantId, documentId);
  const done = await deleteAttachment(documentId, id.parse(fileId));
  if (!done)
    return { ok: false, message: "It's still listed in a Files section. Remove it there first." };
  await audit({
    actor: { type: "staff", id: staff.id },
    action: "document.attachment_deleted",
    target: fileId,
  });
  refresh();
  return { ok: true };
}

export async function restoreDocumentVersionAction(
  tenantId: string,
  documentId: string,
  versionId: string,
): Promise<void> {
  const staff = await requireStaff();
  await ownDocument(tenantId, documentId);
  await restoreDocumentVersion(documentId, id.parse(versionId), staff.id);
  await audit({
    actor: { type: "staff", id: staff.id },
    action: "document.version_restored",
    target: documentId,
    detail: { versionId },
  });
  redirect(`/admin/clients/${tenantId}/documents/${documentId}`);
}
