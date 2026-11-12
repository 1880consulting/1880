import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { and, count, desc, eq, gt, inArray, isNotNull, max, sql } from "drizzle-orm";
import { AUTOSAVE_MERGE_MINUTES, AUTOSAVE_NOTE } from "@/cms/content/store";
import { emptyDoc, validateForPublish, type EntryDoc, type Issue } from "@/cms/content/types";
import { mediaIssues, mediaRefs } from "@/cms/media/refs";
import { getMediaMany } from "@/cms/media/store";
import { storage } from "@/cms/media/storage";
import { db, schema } from "@/lib/db";
import type { DocumentFileRow, DocumentRow } from "@/lib/db/schema";
import { documentType, type PortalBlock } from "@/portal/blocks/schema";

/**
 * Portal documents (PLAN §3.5). The first half is for Studio (callers check
 * requireStaff). The second half is for the portal: every function there
 * takes the client's id and filters every query by it, so one client's
 * documents and files can never be read through another client's address.
 */

const {
  documents,
  documentVersions: versions,
  documentFiles: files,
  documentEvents: events,
} = schema;
const { clientUsers } = schema;

export type DocKind = DocumentRow["kind"];
export type DocFormat = DocumentRow["format"];

/** A version's content: title, summary and blocks; for uploads, the file's id too. */
export type DocumentDoc = EntryDoc & { file?: string };

export const KIND_LABELS: Record<DocKind, string> = {
  report: "Report",
  proposal: "Proposal",
  other: "Document",
};

export interface FileInfo {
  id: string;
  filename: string;
  mime: string;
  bytes: number;
  purpose: DocumentFileRow["purpose"];
}

const toFileInfo = (f: DocumentFileRow): FileInfo => ({
  id: f.id,
  filename: f.filename,
  mime: f.mime,
  bytes: f.bytes,
  purpose: f.purpose,
});

const fileKey = (tenantId: string, fileId: string) => `portal/${tenantId}/${fileId}`;

export class DocumentConflictError extends Error {
  constructor() {
    super("Someone else saved this document since you opened it. Reload to see their changes.");
  }
}

// ===========================================================================
// Studio
// ===========================================================================

async function addVersion(
  doc: DocumentRow,
  content: DocumentDoc,
  authorId: string | null,
  note?: string,
): Promise<string> {
  const id = randomUUID();
  await db().insert(versions).values({
    id,
    documentId: doc.id,
    tenantId: doc.tenantId,
    doc: content,
    authorId,
    note,
  });
  await db().update(documents).set({ draftVersionId: id }).where(eq(documents.id, doc.id));
  return id;
}

export async function createDocument(input: {
  tenantId: string;
  title: string;
  kind: DocKind;
  format: DocFormat;
  authorId: string;
}): Promise<string> {
  const id = randomUUID();
  await db().insert(documents).values({
    id,
    tenantId: input.tenantId,
    kind: input.kind,
    format: input.format,
    createdBy: input.authorId,
  });
  const row = (await getDocumentRow(id))!;
  await addVersion(row, emptyDoc(input.title.trim(), {}), input.authorId, "Created");
  return id;
}

async function getDocumentRow(id: string): Promise<DocumentRow | undefined> {
  const [d] = await db().select().from(documents).where(eq(documents.id, id)).limit(1);
  return d;
}

async function versionDoc(versionId: string | null): Promise<DocumentDoc | null> {
  if (!versionId) return null;
  const [v] = await db().select().from(versions).where(eq(versions.id, versionId)).limit(1);
  return (v?.doc as DocumentDoc) ?? null;
}

export interface StaffDocument {
  document: DocumentRow;
  draft: DocumentDoc;
  published: DocumentDoc | null;
  hasChanges: boolean;
}

export async function getDocument(id: string): Promise<StaffDocument | null> {
  const document = await getDocumentRow(id);
  if (!document) return null;
  const draft = (await versionDoc(document.draftVersionId)) ?? emptyDoc("");
  const published = await versionDoc(document.publishedVersionId);
  return {
    document,
    draft,
    published,
    hasChanges:
      !!document.publishedVersionId && document.publishedVersionId !== document.draftVersionId,
  };
}

export interface DocumentListItem {
  id: string;
  title: string;
  kind: DocKind;
  format: DocFormat;
  status: DocumentRow["status"];
  hasChanges: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
  lastViewedAt: Date | null;
}

/** A client's documents for Studio, newest first, with when anyone last opened each. */
export async function listTenantDocuments(tenantId: string): Promise<DocumentListItem[]> {
  const rows = await db()
    .select({ d: documents, doc: versions.doc })
    .from(documents)
    .innerJoin(versions, eq(versions.id, documents.draftVersionId))
    .where(eq(documents.tenantId, tenantId))
    .orderBy(desc(documents.updatedAt));
  const ids = rows.map((r) => r.d.id);
  const seen = ids.length
    ? await db()
        .select({ id: events.documentId, last: max(events.createdAt) })
        .from(events)
        .where(and(eq(events.tenantId, tenantId), inArray(events.documentId, ids)))
        .groupBy(events.documentId)
    : [];
  const lastSeen = new Map(seen.map((s) => [s.id, s.last]));
  return rows.map(({ d, doc }) => ({
    id: d.id,
    title: (doc as DocumentDoc).title || "Untitled",
    kind: d.kind,
    format: d.format,
    status: d.status,
    hasChanges: !!d.publishedVersionId && d.publishedVersionId !== d.draftVersionId,
    publishedAt: d.publishedAt,
    updatedAt: d.updatedAt,
    lastViewedAt: lastSeen.get(d.id) ?? null,
  }));
}

/** Saves the editor's draft. Refuses if someone else saved in between. */
export async function saveDocumentDraft(
  id: string,
  content: DocumentDoc,
  baseVersionId: string | null,
  authorId: string,
  opts: { autosave?: boolean } = {},
): Promise<string> {
  const d = await getDocumentRow(id);
  if (!d) throw new Error("That document no longer exists.");
  if (baseVersionId !== d.draftVersionId) throw new DocumentConflictError();
  // The uploaded file stays with the draft whatever the editor sends.
  const current = await versionDoc(d.draftVersionId);
  const versionId = await addVersion(
    d,
    { ...content, ...(current?.file ? { file: current.file } : {}) },
    authorId,
    opts.autosave ? AUTOSAVE_NOTE : undefined,
  );
  // Like pages: a run of autosaves keeps one version per ~10 minutes.
  if (opts.autosave && d.draftVersionId && d.draftVersionId !== d.publishedVersionId)
    await db()
      .delete(versions)
      .where(
        and(
          eq(versions.id, d.draftVersionId),
          eq(versions.note, AUTOSAVE_NOTE),
          eq(versions.authorId, authorId),
          gt(versions.createdAt, sql`now(6) - interval ${AUTOSAVE_MERGE_MINUTES} minute`),
        ),
      );
  return versionId;
}

export async function setDocumentKind(id: string, kind: DocKind): Promise<void> {
  await db().update(documents).set({ kind }).where(eq(documents.id, id));
}

/** Title and summary for upload formats (they have no block editor). */
export async function saveDocumentDetails(
  id: string,
  input: { title: string; summary?: string },
  authorId: string,
): Promise<void> {
  const d = await getDocumentRow(id);
  if (!d) throw new Error("That document no longer exists.");
  const current = (await versionDoc(d.draftVersionId)) ?? emptyDoc("");
  const summary = input.summary?.trim();
  await addVersion(
    d,
    { ...current, title: input.title.trim(), fields: summary ? { summary } : {} },
    authorId,
  );
}

const ALLOWED_FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv",
  txt: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  zip: "application/zip",
};

export const MAX_DOCUMENT_FILE_MB = 25;
export const MAX_INTERACTIVE_MB = 15;

export class DocumentFileError extends Error {}

/** What a file is, from its name, or why it can't be uploaded. */
export function checkUpload(
  purpose: DocumentFileRow["purpose"],
  filename: string,
  bytes: number,
  head: Buffer,
): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (purpose === "interactive") {
    if (ext !== "html" && ext !== "htm")
      throw new DocumentFileError("Upload the interactive page as one .html file.");
    if (bytes > MAX_INTERACTIVE_MB * 1024 * 1024)
      throw new DocumentFileError(
        `That page is over ${MAX_INTERACTIVE_MB} MB. Compress its images (WebP) and try again.`,
      );
    if (head.includes(0)) throw new DocumentFileError("That doesn't look like an HTML file.");
    return "text/html";
  }
  const mime = ALLOWED_FILE_TYPES[ext];
  if (!mime)
    throw new DocumentFileError(
      "Upload a PDF, Word, Excel, PowerPoint, CSV, text, image or zip file.",
    );
  if (bytes > MAX_DOCUMENT_FILE_MB * 1024 * 1024)
    throw new DocumentFileError(`That file is over ${MAX_DOCUMENT_FILE_MB} MB.`);
  if (ext === "pdf" && head.subarray(0, 5).toString("latin1") !== "%PDF-")
    throw new DocumentFileError("That file isn't a valid PDF.");
  return mime;
}

const cleanFilename = (name: string) =>
  (name.split(/[\\/]/).pop() ?? "file")
    .replace(/[^\w.\- ()]+/g, "")
    .trim()
    .slice(0, 200) || "file";

/**
 * Stores an upload. For an interactive page or a document's file, the draft
 * points at it (a new version, so the previous file can be restored).
 */
export async function addDocumentFile(
  documentId: string,
  purpose: DocumentFileRow["purpose"],
  upload: { filename: string; data: Buffer },
  authorId: string,
): Promise<FileInfo> {
  const d = await getDocumentRow(documentId);
  if (!d) throw new DocumentFileError("That document no longer exists.");
  if (purpose === "interactive" && d.format !== "interactive")
    throw new DocumentFileError("This document isn't an interactive page.");
  if (purpose === "file" && d.format !== "file")
    throw new DocumentFileError("This document isn't a file.");
  const mime = checkUpload(
    purpose,
    upload.filename,
    upload.data.length,
    upload.data.subarray(0, 1024),
  );
  const id = randomUUID();
  // Stored as plain bytes; the real type is served from this table.
  await storage().put(fileKey(d.tenantId, id), upload.data, "application/octet-stream");
  await db()
    .insert(files)
    .values({
      id,
      tenantId: d.tenantId,
      documentId,
      purpose,
      filename: cleanFilename(upload.filename),
      mime,
      bytes: upload.data.length,
      sha256: createHash("sha256").update(upload.data).digest("hex"),
      createdBy: authorId,
    });
  if (purpose !== "attachment") {
    const current = (await versionDoc(d.draftVersionId)) ?? emptyDoc("");
    await addVersion(
      d,
      { ...current, file: id },
      authorId,
      `Uploaded ${cleanFilename(upload.filename)}`,
    );
  }
  const [row] = await db().select().from(files).where(eq(files.id, id)).limit(1);
  return toFileInfo(row);
}

export async function listDocumentFiles(documentId: string): Promise<FileInfo[]> {
  const rows = await db()
    .select()
    .from(files)
    .where(eq(files.documentId, documentId))
    .orderBy(desc(files.createdAt));
  return rows.map(toFileInfo);
}

/** File ids a version shows: its main file, plus the attachments its files sections list. */
export function referencedFiles(doc: DocumentDoc): string[] {
  const ids = new Set<string>();
  if (doc.file) ids.add(doc.file);
  for (const b of doc.blocks ?? []) {
    if (b.hidden || b.type !== "files") continue;
    for (const f of (b as unknown as Extract<PortalBlock, { type: "files" }>).files ?? [])
      ids.add(f);
  }
  return [...ids];
}

/** Why a draft can't go live yet (empty when it can). */
export async function documentIssues(d: DocumentRow, doc: DocumentDoc): Promise<Issue[]> {
  if (d.format !== "blocks") {
    const issues: Issue[] = [];
    if (!doc.title.trim()) issues.push({ path: ["title"], message: "Give the document a title." });
    if (!doc.file)
      issues.push({
        path: ["file"],
        message: d.format === "interactive" ? "Upload the interactive page." : "Upload the file.",
      });
    return issues;
  }
  const issues = validateForPublish(documentType, doc);
  const refs = mediaRefs(documentType, doc);
  issues.push(...mediaIssues(refs, await getMediaMany(refs.map((r) => r.id))));
  const own = new Set((await listDocumentFiles(d.id)).map((f) => f.id));
  doc.blocks.forEach((b, i) => {
    if (b.hidden || b.type !== "files") return;
    const ids = (b as unknown as { files?: string[] }).files ?? [];
    if (ids.some((f) => !own.has(f)))
      issues.push({
        path: ["blocks", i, "files"],
        message: "A file here was removed. Choose again.",
      });
  });
  return issues;
}

export async function publishDocument(
  id: string,
): Promise<{ ok: true } | { ok: false; issues: Issue[] }> {
  const d = await getDocumentRow(id);
  if (!d) return { ok: false, issues: [{ path: [], message: "That document no longer exists." }] };
  const draft = (await versionDoc(d.draftVersionId)) ?? emptyDoc("");
  const issues = await documentIssues(d, draft);
  if (issues.length) return { ok: false, issues };
  await db()
    .update(documents)
    .set({ status: "published", publishedVersionId: d.draftVersionId, publishedAt: sql`now()` })
    .where(eq(documents.id, id));
  return { ok: true };
}

export async function unpublishDocument(id: string): Promise<void> {
  await db()
    .update(documents)
    .set({ status: "draft", publishedVersionId: null })
    .where(eq(documents.id, id));
}

/** Throws away unpublished changes: the draft becomes the live version again. */
export async function discardDocumentChanges(id: string): Promise<string | null> {
  const d = await getDocumentRow(id);
  if (!d?.publishedVersionId) return null;
  await db()
    .update(documents)
    .set({ draftVersionId: d.publishedVersionId })
    .where(eq(documents.id, id));
  return d.publishedVersionId;
}

export async function deleteDocument(id: string): Promise<void> {
  const d = await getDocumentRow(id);
  if (!d) return;
  for (const f of await listDocumentFiles(id))
    await storage().deletePrefix(fileKey(d.tenantId, f.id));
  await db().delete(files).where(eq(files.documentId, id));
  await db().delete(events).where(eq(events.documentId, id));
  await db().delete(versions).where(eq(versions.documentId, id));
  await db().delete(documents).where(eq(documents.id, id));
}

/** Removes an attachment that neither the draft nor the live version shows. */
export async function deleteAttachment(documentId: string, fileId: string): Promise<boolean> {
  const d = await getDocumentRow(documentId);
  if (!d) return false;
  const current = await Promise.all([d.draftVersionId, d.publishedVersionId].map(versionDoc));
  if (current.some((doc) => doc && referencedFiles(doc).includes(fileId))) return false;
  await db()
    .delete(files)
    .where(
      and(eq(files.id, fileId), eq(files.documentId, documentId), eq(files.purpose, "attachment")),
    );
  await storage().deletePrefix(fileKey(d.tenantId, fileId));
  return true;
}

export async function listDocumentVersions(id: string) {
  return db()
    .select({
      id: versions.id,
      createdAt: versions.createdAt,
      authorId: versions.authorId,
      note: versions.note,
      doc: versions.doc,
    })
    .from(versions)
    .where(eq(versions.documentId, id))
    .orderBy(desc(versions.createdAt))
    .limit(100);
}

/** Makes an old version the draft again (as a new version, so this too can be undone). */
export async function restoreDocumentVersion(id: string, versionId: string, authorId: string) {
  const d = await getDocumentRow(id);
  if (!d) throw new Error("That document no longer exists.");
  const [v] = await db()
    .select()
    .from(versions)
    .where(and(eq(versions.id, versionId), eq(versions.documentId, id)))
    .limit(1);
  if (!v) throw new Error("That version no longer exists.");
  return addVersion(d, v.doc as DocumentDoc, authorId, "Restored an earlier version");
}

export interface Receipt {
  name: string;
  email: string;
  lastViewedAt: Date | null;
  views: number;
  downloads: number;
}

/** Who opened a document and when (PLAN §3.4 receipts). */
export async function documentReceipts(documentId: string): Promise<Receipt[]> {
  const rows = await db()
    .select({
      name: clientUsers.name,
      email: clientUsers.email,
      kind: events.kind,
      n: count(),
      last: max(events.createdAt),
    })
    .from(events)
    .innerJoin(clientUsers, eq(clientUsers.id, events.clientUserId))
    .where(eq(events.documentId, documentId))
    .groupBy(clientUsers.id, events.kind);
  const byPerson = new Map<string, Receipt>();
  for (const r of rows) {
    const p = byPerson.get(r.email) ?? {
      name: r.name,
      email: r.email,
      lastViewedAt: null,
      views: 0,
      downloads: 0,
    };
    if (r.kind === "view") {
      p.views = r.n;
      p.lastViewedAt = r.last;
    } else p.downloads = r.n;
    byPerson.set(r.email, p);
  }
  return [...byPerson.values()].sort(
    (a, b) => (b.lastViewedAt?.getTime() ?? 0) - (a.lastViewedAt?.getTime() ?? 0),
  );
}

/** A file for Studio's preview: any file of the document, published or not. */
export async function readFileForStaff(documentId: string, fileId: string) {
  const [f] = await db()
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.documentId, documentId)))
    .limit(1);
  if (!f) return null;
  const stored = await storage().get(fileKey(f.tenantId, f.id));
  return stored ? { file: toFileInfo(f), data: stored.data } : null;
}

// ===========================================================================
// Portal (always scoped to one client)
// ===========================================================================

export interface ClientDocumentItem {
  id: string;
  kind: DocKind;
  format: DocFormat;
  title: string;
  summary?: string;
  publishedAt: Date;
  /** Published (or updated) since this person last opened it. */
  isNew: boolean;
}

/** A client's live documents, newest first, optionally one kind or matching a search. */
export async function listClientDocuments(
  tenantId: string,
  userId: string,
  opts: { kind?: DocKind; q?: string } = {},
): Promise<ClientDocumentItem[]> {
  const rows = await db()
    .select({ d: documents, doc: versions.doc })
    .from(documents)
    .innerJoin(versions, eq(versions.id, documents.publishedVersionId))
    .where(
      and(
        eq(documents.tenantId, tenantId),
        eq(versions.tenantId, tenantId),
        eq(documents.status, "published"),
        isNotNull(documents.publishedAt),
        opts.kind ? eq(documents.kind, opts.kind) : undefined,
      ),
    )
    .orderBy(desc(documents.publishedAt));
  const seen = await db()
    .select({ id: events.documentId, last: max(events.createdAt) })
    .from(events)
    .where(
      and(eq(events.tenantId, tenantId), eq(events.clientUserId, userId), eq(events.kind, "view")),
    )
    .groupBy(events.documentId);
  const lastSeen = new Map(seen.map((s) => [s.id, s.last]));
  const q = opts.q?.trim().toLowerCase();
  return rows
    .map(({ d, doc }) => {
      const content = doc as DocumentDoc;
      const last = lastSeen.get(d.id);
      return {
        id: d.id,
        kind: d.kind,
        format: d.format,
        title: content.title,
        summary: (content.fields?.summary as string | undefined) || undefined,
        publishedAt: d.publishedAt!,
        isNew: !last || last < d.publishedAt!,
      };
    })
    .filter(
      (item) =>
        !q || item.title.toLowerCase().includes(q) || item.summary?.toLowerCase().includes(q),
    );
}

export interface ClientDocument {
  id: string;
  kind: DocKind;
  format: DocFormat;
  publishedAt: Date;
  doc: DocumentDoc;
  /** The files this version shows, by id. */
  files: Record<string, FileInfo>;
}

/** One live document of this client, or null (unknown, unpublished or another client's). */
export async function getClientDocument(
  tenantId: string,
  documentId: string,
): Promise<ClientDocument | null> {
  const [row] = await db()
    .select({ d: documents, doc: versions.doc })
    .from(documents)
    .innerJoin(versions, eq(versions.id, documents.publishedVersionId))
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.tenantId, tenantId),
        eq(versions.tenantId, tenantId),
        eq(documents.status, "published"),
      ),
    )
    .limit(1);
  if (!row) return null;
  const doc = row.doc as DocumentDoc;
  const ids = referencedFiles(doc);
  const found = ids.length
    ? await db()
        .select()
        .from(files)
        .where(
          and(
            eq(files.tenantId, tenantId),
            eq(files.documentId, documentId),
            inArray(files.id, ids),
          ),
        )
    : [];
  return {
    id: row.d.id,
    kind: row.d.kind,
    format: row.d.format,
    publishedAt: row.d.publishedAt!,
    doc,
    files: Object.fromEntries(found.map((f) => [f.id, toFileInfo(f)])),
  };
}

/** A file's bytes, only if this client's live document shows it. */
export async function readClientFile(tenantId: string, documentId: string, fileId: string) {
  const document = await getClientDocument(tenantId, documentId);
  const file = document?.files[fileId];
  if (!file) return null;
  const stored = await storage().get(fileKey(tenantId, fileId));
  return stored ? { file, data: stored.data } : null;
}

export async function recordDocumentEvent(input: {
  tenantId: string;
  documentId: string;
  clientUserId: string;
  kind: "view" | "download";
  fileId?: string;
}): Promise<void> {
  await db().insert(events).values(input);
}

/** The people at a client, for "new report" emails. */
export async function clientRecipients(tenantId: string) {
  return db()
    .select({ id: clientUsers.id, name: clientUsers.name, email: clientUsers.email })
    .from(schema.memberships)
    .innerJoin(clientUsers, eq(clientUsers.id, schema.memberships.clientUserId))
    .where(and(eq(schema.memberships.tenantId, tenantId), eq(clientUsers.status, "active")));
}
