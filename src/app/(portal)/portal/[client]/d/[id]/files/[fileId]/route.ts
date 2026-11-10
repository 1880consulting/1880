import { after, connection } from "next/server";
import { cookies } from "next/headers";
import { clientAreaFor } from "@/lib/portal/access";
import { PORTAL_COOKIE } from "@/lib/portal/cookie";
import { readClientFile, recordDocumentEvent } from "@/lib/portal/documents";
import { fileResponse, notFoundResponse } from "@/lib/portal/serve";
import { getSessionClientUser } from "@/lib/portal/users";

/**
 * A document's file or attachment, streamed through the portal after the
 * same checks as its page (PLAN §2.3 point 6). `?download=1` saves it.
 */
export async function GET(
  req: Request,
  { params }: RouteContext<"/portal/[client]/d/[id]/files/[fileId]">,
) {
  await connection();
  const { client: slug, id, fileId } = await params;
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  const user = token ? await getSessionClientUser(token) : null;
  const client = user ? await clientAreaFor(user.id, slug) : null;
  if (!user || !client) return notFoundResponse();
  const read = await readClientFile(client.id, id, fileId);
  if (!read) return notFoundResponse();
  const download = new URL(req.url).searchParams.has("download");
  if (download)
    after(() =>
      recordDocumentEvent({
        tenantId: client.id,
        documentId: id,
        clientUserId: user.id,
        kind: "download",
        fileId,
      }),
    );
  return fileResponse(read.file, read.data, download);
}
