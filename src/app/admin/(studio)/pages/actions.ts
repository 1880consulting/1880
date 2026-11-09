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
import { docSchema, slugify } from "@/cms/content/types";
import type { ActionResult, DiscardResult, SaveResult } from "@/cms/editor/PageEditor";
import { mediaIssues, mediaRefs } from "@/cms/media/refs";
import { getMediaMany } from "@/cms/media/store";
import { pageType } from "@/site/cms";
import { pageTag, REDIRECTS_TAG } from "@/site/pages";

const id = z.uuid();

/** Turns the store's errors into something the editor can show. */
function failure(err: unknown): Exclude<ActionResult, { ok: true }> {
  if (err instanceof InvalidError)
    return {
      ok: false,
      message: "Some fields need attention before this can go live.",
      issues: err.issues,
    };
  if (err instanceof ConflictError) return { ok: false, message: err.message, conflict: true };
  if (err instanceof SlugTakenError)
    return { ok: false, message: err.message, issues: [{ path: ["slug"], message: err.message }] };
  throw err;
}

/** Fresh content on the public site right away, for every address that changed. */
function refreshPublic(slugs: string[]) {
  for (const slug of slugs) updateTag(pageTag(slug));
  updateTag(REDIRECTS_TAG);
}

export interface NewPageState {
  status: "idle" | "error";
  message?: string;
  values?: { title: string; slug: string };
}

export async function createPage(_prev: NewPageState, form: FormData): Promise<NewPageState> {
  const me = await requireStaff();
  const title = String(form.get("title") ?? "")
    .trim()
    .slice(0, 200);
  const slug = String(form.get("slug") ?? "").trim() || slugify(title);
  if (!title)
    return { status: "error", message: "Give the page a title.", values: { title, slug } };
  let newId: string;
  try {
    newId = await createEntry(pageType, { title, slug }, me.id);
  } catch (err) {
    if (err instanceof InvalidError || err instanceof SlugTakenError) {
      return { status: "error", message: err.message, values: { title, slug } };
    }
    throw err;
  }
  await audit({
    actor: { type: "staff", id: me.id },
    action: "page.created",
    target: newId,
    detail: { slug },
  });
  redirect(`/admin/pages/${newId}`);
}

const saveInput = z.object({
  doc: docSchema,
  slug: z.string().max(200),
  baseVersionId: z.uuid().nullable(),
});

export async function savePage(entryId: string, input: unknown): Promise<SaveResult> {
  const me = await requireStaff();
  const parsed = saveInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "That couldn't be saved. Reload the page and try again." };
  try {
    const versionId = await saveDraft(pageType, id.parse(entryId), parsed.data, me.id);
    return { ok: true, versionId };
  } catch (err) {
    return failure(err);
  }
}

export async function publishPage(entryId: string): Promise<ActionResult> {
  const me = await requireStaff();
  try {
    // Every image must still exist and have alt text (PLAN D26).
    const found = await getEntry(id.parse(entryId));
    if (found) {
      const refs = mediaRefs(pageType, found.draft);
      const issues = mediaIssues(refs, await getMediaMany(refs.map((r) => r.id)));
      if (issues.length) throw new InvalidError(issues);
    }
    const { slugs } = await publish(pageType, id.parse(entryId), me.id);
    refreshPublic(slugs);
    await audit({
      actor: { type: "staff", id: me.id },
      action: "page.published",
      target: entryId,
      detail: { slugs },
    });
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export async function unpublishPage(entryId: string): Promise<ActionResult> {
  const me = await requireStaff();
  const found = await getEntry(id.parse(entryId));
  if (found?.entry.publishedSlug === "")
    return { ok: false, message: "The home page can't be unpublished." };
  const { slugs } = await unpublish(entryId, me.id);
  refreshPublic(slugs);
  await audit({ actor: { type: "staff", id: me.id }, action: "page.unpublished", target: entryId });
  return { ok: true };
}

export async function discardPageChanges(entryId: string): Promise<DiscardResult> {
  const me = await requireStaff();
  await discardChanges(id.parse(entryId), me.id);
  const found = await getEntry(entryId);
  if (!found?.entry.draftVersionId) return { ok: false, message: "This page no longer exists." };
  return {
    ok: true,
    doc: found.draft,
    slug: found.entry.slug,
    versionId: found.entry.draftVersionId,
  };
}

export async function deletePage(entryId: string): Promise<ActionResult> {
  const me = await requireStaff();
  try {
    const { slugs } = await deleteEntry(id.parse(entryId));
    refreshPublic(slugs);
  } catch (err) {
    return failure(err);
  }
  await audit({ actor: { type: "staff", id: me.id }, action: "page.deleted", target: entryId });
  redirect("/admin/pages");
}

export async function restorePageVersion(entryId: string, versionId: string): Promise<void> {
  const me = await requireStaff();
  await restoreVersion(id.parse(entryId), id.parse(versionId), me.id);
  await audit({
    actor: { type: "staff", id: me.id },
    action: "page.version_restored",
    target: entryId,
    detail: { versionId },
  });
  redirect(`/admin/pages/${entryId}`);
}
