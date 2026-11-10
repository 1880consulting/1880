import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { clientAreaFor, type ClientArea } from "./access";
import { PORTAL_COOKIE } from "./cookie";
import {
  createClientSession,
  deleteClientSession,
  getSessionClientUser,
  type ClientUser,
} from "./users";

export type { ClientUser } from "./users";
export type { ClientArea } from "./access";

/** Who is signed in to the portal, read from the cookie once per request. */
export const currentClientUser = cache(async (): Promise<ClientUser | null> => {
  await connection(); // private and always current: only for a real request
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  return token ? getSessionClientUser(token) : null;
});

/** Signed in, or off to the sign-in page. */
export async function requireClientUser(): Promise<ClientUser> {
  const user = await currentClientUser();
  if (!user) redirect("/");
  return user;
}

/**
 * Call first in every page and action under a client. Not signed in → sign-in
 * page. Unknown client, archived client or not theirs → the same Not found.
 * `src/proxy.ts` already made this check (so the 404 status is real); this is
 * the second line of defense.
 */
export const requireClientArea = cache(
  async (slug: string): Promise<{ user: ClientUser; client: ClientArea }> => {
    const user = await requireClientUser();
    const client = await clientAreaFor(user.id, slug);
    if (!client) notFound();
    return { user, client };
  },
);

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  // No `domain`: host-only, so this cookie stays on the portal's host.
} as const;

/** Signs this browser in (server actions only). */
export async function startClientSession(userId: string): Promise<void> {
  const { token, expiresAt } = await createClientSession(userId);
  (await cookies()).set(PORTAL_COOKIE, token, { ...cookieOptions, expires: expiresAt });
}

/** Signs this browser out (server actions only). */
export async function endClientSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(PORTAL_COOKIE)?.value;
  if (token) await deleteClientSession(token);
  jar.set(PORTAL_COOKIE, "", { ...cookieOptions, expires: new Date(0) });
}

/** Where to go after sign-in: a page under a client, or the portal's start. */
export function safePortalNext(next: unknown): string {
  return typeof next === "string" &&
    /^\/[a-z0-9]+(?:-[a-z0-9]+)*(\/[^/\\]*)*$/.test(next.split("?")[0]) &&
    !next.includes("//")
    ? next
    : "/";
}
