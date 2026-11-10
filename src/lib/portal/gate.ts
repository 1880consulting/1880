import "server-only";
import { clientAreaFor } from "./access";
import { getSessionClientUser } from "./users";

export type GateDecision = "ok" | "sign-in" | "not-found";

/**
 * The portal check `src/proxy.ts` runs before a page under a client starts
 * rendering (a streamed page has already sent its 200 status, so a 404 has to
 * be decided here). No session → sign in. Signed in but the client is unknown,
 * archived or someone else's → Not found, the same answer for all three.
 */
export async function portalGate(token: string | undefined, slug: string): Promise<GateDecision> {
  if (!token) return "sign-in";
  const user = await getSessionClientUser(token);
  if (!user) return "sign-in";
  return (await clientAreaFor(user.id, slug)) ? "ok" : "not-found";
}
