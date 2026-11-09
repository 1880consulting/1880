import { connection } from "next/server";
import { z } from "zod";
import { audit } from "@/cms/audit";
import { currentStaff } from "@/cms/auth";
import { MAX_UPLOAD_BYTES, UploadError } from "@/cms/media/process";
import { addMedia, replaceMedia } from "@/cms/media/store";

/**
 * Studio uploads: POST a form with `file` (and `replace` = an image id to swap
 * the file behind an existing image). Answers JSON.
 *
 * This address skips proxy.ts (see its matcher), so the proxy doesn't buffer
 * large bodies; it checks the session and the request's origin itself.
 */
export async function POST(request: Request) {
  await connection();
  const staff = await currentStaff();
  if (!staff) return json({ error: "Your session ended. Sign in again." }, 401);

  // Only Studio's own pages may upload (no other site can make your browser do it).
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host)
    return json({ error: "Upload refused." }, 403);

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_UPLOAD_BYTES + 64 * 1024)
    return json({ error: "That file is over 15 MB. Use a smaller image." }, 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "That upload didn't arrive complete. Try again." }, 400);
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0)
    return json({ error: "Choose an image to upload." }, 400);
  const replace = form.get("replace");

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (typeof replace === "string" && replace) {
      const id = z.uuid().parse(replace);
      const media = await replaceMedia(id, buffer, file.name);
      await audit({ actor: { type: "staff", id: staff.id }, action: "media.replaced", target: id });
      return json({ media, replaced: true });
    }
    const { media, existed } = await addMedia(buffer, file.name, staff.id);
    if (!existed)
      await audit({
        actor: { type: "staff", id: staff.id },
        action: "media.uploaded",
        target: media.id,
      });
    return json({ media, existed });
  } catch (err) {
    if (err instanceof UploadError) return json({ error: err.message }, 422);
    console.error("[media] upload failed", err);
    return json({ error: "That upload failed. Try again." }, 500);
  }
}

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
