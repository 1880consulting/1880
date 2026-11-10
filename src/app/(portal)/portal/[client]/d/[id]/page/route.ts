import { connection } from "next/server";
import { cookies } from "next/headers";
import { clientAreaFor } from "@/lib/portal/access";
import { PORTAL_COOKIE } from "@/lib/portal/cookie";
import { getClientDocument, readClientFile } from "@/lib/portal/documents";
import { interactiveResponse, notFoundResponse } from "@/lib/portal/serve";
import { getSessionClientUser } from "@/lib/portal/users";

/**
 * An interactive page's HTML, for the viewer's sandboxed frame. proxy.ts has
 * checked access already; this checks again, then serves the file under its
 * own policy (no same-origin access, no network, framed only by the portal).
 */
export async function GET(_req: Request, { params }: RouteContext<"/portal/[client]/d/[id]/page">) {
  await connection();
  const { client: slug, id } = await params;
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  const user = token ? await getSessionClientUser(token) : null;
  const client = user ? await clientAreaFor(user.id, slug) : null;
  if (!client) return notFoundResponse();
  const doc = await getClientDocument(client.id, id);
  if (!doc || doc.format !== "interactive" || !doc.doc.file) return notFoundResponse();
  const read = await readClientFile(client.id, id, doc.doc.file);
  return read ? interactiveResponse(read.data) : notFoundResponse();
}
