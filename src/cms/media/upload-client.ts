import type { MediaInfo } from "./types";

export const UPLOAD_URL = "/admin/media/upload";
export const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";
export const MAX_MB = 15;

/** Sends one file to Studio's upload endpoint. Throws with a message people can act on. */
export async function uploadFile(
  file: File,
  replaceId?: string,
): Promise<{ media: MediaInfo; existed?: boolean }> {
  if (file.size > MAX_MB * 1024 * 1024)
    throw new Error(`"${file.name}" is over ${MAX_MB} MB. Use a smaller image.`);
  const body = new FormData();
  body.append("file", file);
  if (replaceId) body.append("replace", replaceId);
  let res: Response;
  try {
    res = await fetch(UPLOAD_URL, { method: "POST", body });
  } catch {
    throw new Error(`"${file.name}" didn't upload. Check your connection and try again.`);
  }
  const data = (await res.json().catch(() => ({}))) as {
    media?: MediaInfo;
    existed?: boolean;
    error?: string;
  };
  if (!res.ok || !data.media)
    throw new Error(data.error ?? `"${file.name}" didn't upload. Try again.`);
  return { media: data.media, existed: data.existed };
}
