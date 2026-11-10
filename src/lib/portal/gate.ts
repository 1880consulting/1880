import "server-only";
import { clientAreaFor } from "./access";
import { getClientDocument } from "./documents";
import { getSessionClientUser } from "./users";

export type GateDecision = "ok" | "sign-in" | "not-found";

/**
 * The portal check `src/proxy.ts` runs before a page under a client starts
 * rendering (a streamed page has already sent its 200 status, so a 404 has to
 * be decided here). No session → sign in. Signed in but the client is unknown,
 * archived or someone else's → Not found, the same answer for all three.
 */
export async function portalGate(
  token: string | undefined,
  slug: string,
  documentId?: string,
): Promise<GateDecision> {
  if (!token) return "sign-in";
  const user = await getSessionClientUser(token);
  if (!user) return "sign-in";
  const client = await clientAreaFor(user.id, slug);
  if (!client) return "not-found";
  // A document address: it must be one of this client's live documents.
  if (documentId !== undefined)
    return /^[0-9a-f-]{36}$/.test(documentId) && (await getClientDocument(client.id, documentId))
      ? "ok"
      : "not-found";
  return "ok";
}

/** The document id in a portal address like /acme/d/<id>/…, if there is one. */
export function documentIdIn(pathname: string): string | undefined {
  const m = /^\/[^/]+\/d\/([^/]+)(?:\/|$)/.exec(pathname);
  return m?.[1];
}
