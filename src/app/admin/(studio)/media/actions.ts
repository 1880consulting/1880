"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/cms/audit";
import { requireStaff } from "@/cms/auth";
import { deleteMedia, listMedia, MediaInUseError, updateMedia } from "@/cms/media/store";
import type { MediaInfo } from "@/cms/media/types";
import { mediaTag } from "@/site/pages";

const id = z.uuid();
const details = z.object({
  alt: z.string().max(300),
  focalX: z.number().int().min(0).max(1000),
  focalY: z.number().int().min(0).max(1000),
});

export type MediaActionResult = { ok: true } | { ok: false; message: string };

/** Saves alt text and focal point; every page showing the image updates. */
export async function saveMediaDetails(
  mediaId: string,
  input: unknown,
): Promise<MediaActionResult> {
  await requireStaff();
  const parsed = details.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "That couldn't be saved. Reload and try again." };
  await updateMedia(id.parse(mediaId), parsed.data);
  updateTag(mediaTag(mediaId));
  return { ok: true };
}

/** After the file behind an image is replaced: refresh every page that shows it. */
export async function mediaFileReplaced(mediaId: string): Promise<void> {
  await requireStaff();
  updateTag(mediaTag(id.parse(mediaId)));
}

export async function removeMedia(mediaId: string): Promise<MediaActionResult> {
  const me = await requireStaff();
  try {
    await deleteMedia(id.parse(mediaId));
  } catch (err) {
    if (err instanceof MediaInUseError)
      return { ok: false, message: `This image can't be deleted. ${err.message}` };
    throw err;
  }
  await audit({ actor: { type: "staff", id: me.id }, action: "media.deleted", target: mediaId });
  redirect("/admin/media");
}

/** For the image picker in the page editor. */
export async function listMediaForPicker(): Promise<MediaInfo[]> {
  await requireStaff();
  return listMedia();
}
