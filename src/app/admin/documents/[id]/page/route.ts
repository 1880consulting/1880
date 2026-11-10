import { connection } from "next/server";
import { z } from "zod";
import { currentStaff } from "@/cms/auth";
import { getDocument, readFileForStaff } from "@/lib/portal/documents";
import { interactiveResponse, notFoundResponse } from "@/lib/portal/serve";

/** Studio's preview of an uploaded interactive page (the draft's file), sandboxed like the portal's. */
export async function GET(_req: Request, { params }: RouteContext<"/admin/documents/[id]/page">) {
  await connection();
  if (!(await currentStaff())) return notFoundResponse();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return notFoundResponse();
  const found = await getDocument(id);
  const fileId = found?.draft.file;
  if (!found || found.document.format !== "interactive" || !fileId) return notFoundResponse();
  const read = await readFileForStaff(id, fileId);
  return read ? interactiveResponse(read.data) : notFoundResponse();
}
