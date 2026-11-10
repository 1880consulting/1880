import { connection } from "next/server";
import { z } from "zod";
import { currentStaff } from "@/cms/auth";
import { readFileForStaff } from "@/lib/portal/documents";
import { fileResponse, notFoundResponse } from "@/lib/portal/serve";

/** A document's file for Studio (preview and checking uploads). */
export async function GET(
  req: Request,
  { params }: RouteContext<"/admin/documents/[id]/files/[fileId]">,
) {
  await connection();
  if (!(await currentStaff())) return notFoundResponse();
  const { id, fileId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(fileId).success)
    return notFoundResponse();
  const read = await readFileForStaff(id, fileId);
  if (!read) return notFoundResponse();
  return fileResponse(read.file, read.data, new URL(req.url).searchParams.has("download"));
}
