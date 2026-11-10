import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { hashToken, newToken } from "@/cms/staff/tokens";
import { db, schema } from "@/lib/db";
import type { ClientUserRow } from "@/lib/db/schema";
import { PORTAL_SESSION_DAYS } from "./cookie";

/**
 * Client people, their sessions and their emailed sign-in links. Database
 * logic only: cookies live in ./auth.ts, access to a client in ./access.ts.
 */

const { clientUsers: users, clientSessions: sessions, clientTokens: tokens } = schema;

export type ClientTokenPurpose = "login" | "invite";

export interface ClientUser {
  id: string;
  email: string;
  name: string;
}

/** How long each kind of link works, in minutes. */
export const CLIENT_TOKEN_MINUTES: Record<ClientTokenPurpose, number> = {
  login: 15,
  invite: 7 * 24 * 60,
};

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

const toUser = (u: ClientUserRow): ClientUser => ({ id: u.id, email: u.email, name: u.name });

export async function findClientUserByEmail(email: string): Promise<ClientUserRow | undefined> {
  const [u] = await db()
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);
  return u;
}

export async function getClientUser(id: string): Promise<ClientUserRow | undefined> {
  const [u] = await db().select().from(users).where(eq(users.id, id)).limit(1);
  return u;
}

/** Finds a person by email, or adds them. Their name is only set the first time. */
export async function ensureClientUser(input: { email: string; name: string }): Promise<string> {
  const existing = await findClientUserByEmail(input.email);
  if (existing) return existing.id;
  const id = randomUUID();
  await db()
    .insert(users)
    .values({ id, email: normalizeEmail(input.email), name: input.name.trim() });
  return id;
}

// ---- Sessions ----

export async function createClientSession(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + PORTAL_SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db()
    .insert(sessions)
    .values({ tokenHash: hashToken(token), userId, expiresAt });
  await db()
    .update(users)
    .set({ lastLoginAt: sql`now()` })
    .where(eq(users.id, userId));
  if (Math.random() < 0.05)
    await db()
      .delete(sessions)
      .where(lt(sessions.expiresAt, sql`now()`));
  return { token, expiresAt };
}

/** The person behind a session cookie, if the session is current and the person active. */
export async function getSessionClientUser(token: string): Promise<ClientUser | null> {
  if (!token || token.length > 100) return null;
  const [row] = await db()
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        gt(sessions.expiresAt, sql`now()`),
        eq(users.status, "active"),
      ),
    )
    .limit(1);
  return row ? toUser(row.user) : null;
}

export async function deleteClientSession(token: string): Promise<void> {
  await db()
    .delete(sessions)
    .where(eq(sessions.tokenHash, hashToken(token)));
}

export async function deleteClientUserSessions(userId: string): Promise<void> {
  await db().delete(sessions).where(eq(sessions.userId, userId));
}

// ---- Emailed links ----

/** A new link. Any earlier unused link of the same kind for this person stops working. */
export async function issueClientToken(
  userId: string,
  purpose: ClientTokenPurpose,
): Promise<string> {
  await db()
    .delete(tokens)
    .where(and(eq(tokens.userId, userId), eq(tokens.purpose, purpose), isNull(tokens.usedAt)));
  const token = newToken();
  await db()
    .insert(tokens)
    .values({
      tokenHash: hashToken(token),
      userId,
      purpose,
      expiresAt: new Date(Date.now() + CLIENT_TOKEN_MINUTES[purpose] * 60 * 1000),
    });
  return token;
}

/** Looks at a link without using it up (for the confirm page). */
export async function peekClientToken(token: string): Promise<ClientUserRow | null> {
  if (!token || token.length > 100) return null;
  const [row] = await db()
    .select({ user: users })
    .from(tokens)
    .innerJoin(users, eq(users.id, tokens.userId))
    .where(
      and(
        eq(tokens.tokenHash, hashToken(token)),
        isNull(tokens.usedAt),
        gt(tokens.expiresAt, sql`now()`),
        eq(users.status, "active"),
      ),
    )
    .limit(1);
  return row?.user ?? null;
}

/** Uses a link up. Atomic: of two simultaneous uses, only one succeeds. */
export async function consumeClientToken(token: string): Promise<ClientUserRow | null> {
  const user = await peekClientToken(token);
  if (!user) return null;
  const [res] = await db()
    .update(tokens)
    .set({ usedAt: sql`now()` })
    .where(and(eq(tokens.tokenHash, hashToken(token)), isNull(tokens.usedAt)));
  return res.affectedRows === 1 ? user : null;
}
