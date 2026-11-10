"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/cms/audit";
import { requireStaff } from "@/cms/auth";
import {
  ConflictError,
  createEntry,
  deleteEntry,
  discardChanges,
  getEntry,
  InvalidError,
  publish,
  restoreVersion,
  saveDraft,
  SlugTakenError,
  unpublish,
} from "@/cms/content/store";
import { docSchema, slugify, type ContentType } from "@/cms/content/types";
import type { ActionResult, DiscardResult, SaveResult } from "@/cms/editor/PageEditor";
import { mediaIssues, mediaRefs } from "@/cms/media/refs";
import { getMediaMany } from "@/cms/media/store";
import { CONTENT_TYPES } from "@/site/cms";
import { entryTag, listTag, REDIRECTS_TAG } from "@/site/pages";
import { STUDIO } from "./config";

/**
 * Studio actions for every content type (pages, case studies, services).
 * Each is bound to a type id; the id and every argument are checked here,
 * because actions are public endpoints.
 */

const id = z.uuid();
const typeIdSchema = z.enum(["page", "work", "service"]);

function contentType(typeId: unknown): ContentType {
  return CONTENT_TYPES[typeIdSchema.parse(typeId)];
}

/** The entry, if it exists and is of this type (so one type's actions can't touch another's entries). */
async function ownEntry(type: ContentType, entryId: unknown) {
  const found = await getEntry(id.parse(entryId));
  if (!found || found.entry.type !== type.id) {
    throw new InvalidError([
      { path: [], message: `This ${type.label.toLowerCase()} no longer exists.` },
    ]);
  }
  return found;
}

/** Turns the store's errors into something the editor can show. */
function failure(err: unknown): Exclude<ActionResult, { ok: true }> {
  if (err instanceof InvalidError) {
    return {
      ok: false,
      message:
        err.issues[0]?.path.length === 0
          ? err.message
          : "Some fields need attention before this can go live.",
      issues: err.issues,
    };
  }
  if (err instanceof ConflictError) return { ok: false, message: err.message, conflict: true };
  if (err instanceof SlugTakenError) {
    return { ok: false, message: err.message, issues: [{ path: ["slug"], message: err.message }] };
  }
  throw err;
}

/**
 * Fresh content on the public site right away: the entry's addresses, its
 * type's listing (and the pages that show those titles), and redirects.
 */
function refreshPublic(type: ContentType, slugs: string[]) {
  for (const slug of slugs) updateTag(entryTag(type.id, slug));
  updateTag(listTag(type.id));
  updateTag(REDIRECTS_TAG);
}

export interface NewEntryState {
  status: "idle" | "error";
  message?: string;
  values?: { title: string; slug: string };
}

export async function createEntryAction(
  typeId: string,
  _prev: NewEntryState,
  form: FormData,
): Promise<NewEntryState> {
  const me = await requireStaff();
  const type = contentType(typeId);
  const title = String(form.get("title") ?? "")
    .trim()
    .slice(0, 200);
  const slug = String(form.get("slug") ?? "").trim() || slugify(title);
  if (!title) return { status: "error", message: "Give it a title.", values: { title, slug } };
  let newId: string;
  try {
    newId = await createEntry(type, { title, slug }, me.id);
  } catch (err) {
    if (err instanceof InvalidError || err instanceof SlugTakenError) {
      return { status: "error", message: err.message, values: { title, slug } };
    }
    throw err;
  }
  await audit({
    actor: { type: "staff", id: me.id },
    action: `${type.id}.created`,
    target: newId,
    detail: { slug },
  });
  redirect(`${STUDIO[type.id as keyof typeof STUDIO].base}/${newId}`);
}

const saveInput = z.object({
  doc: docSchema,
  slug: z.string().max(200),
  baseVersionId: z.uuid().nullable(),
});

export async function saveEntryAction(
  typeId: string,
  entryId: string,
  input: unknown,
): Promise<SaveResult> {
  const me = await requireStaff();
  const type = contentType(typeId);
  const parsed = saveInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "That couldn't be saved. Reload the page and try again." };
  try {
    await ownEntry(type, entryId);
    const versionId = await saveDraft(type, entryId, parsed.data, me.id);
    return { ok: true, versionId };
  } catch (err) {
    return failure(err);
  }
}

export async function publishEntryAction(typeId: string, entryId: string): Promise<ActionResult> {
  const me = await requireStaff();
  const type = contentType(typeId);
  try {
    const found = await ownEntry(type, entryId);
    // Every image must still exist and have alt text (PLAN D26).
    const refs = mediaRefs(type, found.draft);
    const issues = mediaIssues(refs, await getMediaMany(refs.map((r) => r.id)));
    if (issues.length) throw new InvalidError(issues);
    const { slugs } = await publish(type, entryId, me.id);
    refreshPublic(type, slugs);
    await audit({
      actor: { type: "staff", id: me.id },
      action: `${type.id}.published`,
      target: entryId,
      detail: { slugs },
    });
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export async function unpublishEntryAction(typeId: string, entryId: string): Promise<ActionResult> {
  const me = await requireStaff();
  const type = contentType(typeId);
  try {
    const found = await ownEntry(type, entryId);
    if (found.entry.publishedSlug === "")
      return { ok: false, message: "The home page can't be unpublished." };
    const { slugs } = await unpublish(entryId, me.id);
    refreshPublic(type, slugs);
  } catch (err) {
    return failure(err);
  }
  await audit({
    actor: { type: "staff", id: me.id },
    action: `${type.id}.unpublished`,
    target: entryId,
  });
  return { ok: true };
}

export async function discardEntryAction(typeId: string, entryId: string): Promise<DiscardResult> {
  const me = await requireStaff();
  const type = contentType(typeId);
  try {
    await ownEntry(type, entryId);
  } catch (err) {
    return failure(err);
  }
  await discardChanges(entryId, me.id);
  const found = await getEntry(entryId);
  if (!found?.entry.draftVersionId) return { ok: false, message: "This no longer exists." };
  return {
    ok: true,
    doc: found.draft,
    slug: found.entry.slug,
    versionId: found.entry.draftVersionId,
  };
}

export async function deleteEntryAction(typeId: string, entryId: string): Promise<ActionResult> {
  const me = await requireStaff();
  const type = contentType(typeId);
  try {
    await ownEntry(type, entryId);
    const { slugs } = await deleteEntry(entryId);
    refreshPublic(type, slugs);
  } catch (err) {
    return failure(err);
  }
  await audit({
    actor: { type: "staff", id: me.id },
    action: `${type.id}.deleted`,
    target: entryId,
  });
  redirect(STUDIO[type.id as keyof typeof STUDIO].base);
}

export async function restoreEntryVersion(
  typeId: string,
  entryId: string,
  versionId: string,
): Promise<void> {
  const me = await requireStaff();
  const type = contentType(typeId);
  await ownEntry(type, entryId);
  await restoreVersion(entryId, id.parse(versionId), me.id);
  await audit({
    actor: { type: "staff", id: me.id },
    action: `${type.id}.version_restored`,
    target: entryId,
    detail: { versionId },
  });
  redirect(`${STUDIO[type.id as keyof typeof STUDIO].base}/${entryId}`);
}
