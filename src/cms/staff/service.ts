import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, count, eq, gt, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { StaffUserRow } from "@/lib/db/schema";
import { SESSION_DAYS } from "./cookie";
import { dummyVerify, hashPassword, verifyPassword } from "./password";
import { hashToken, newToken } from "./tokens";

/**
 * Staff accounts, sessions and one-time links for 1880 Studio (PLAN D21, D24).
 * Database logic only: cookies and request details live in src/cms/auth.ts.
 */

const { staffUsers: users, staffSessions: sessions, staffTokens: tokens } = schema;

export type Role = StaffUserRow["role"];
export type TokenPurpose = "login" | "invite" | "reset";

export interface Staff {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/** How long each kind of link works. */
export const TOKEN_MINUTES: Record<TokenPurpose, number> = {
  login: 15,
  reset: 60,
  invite: 7 * 24 * 60,
};

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

const toStaff = (u: StaffUserRow): Staff => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
});

export async function findStaffByEmail(email: string): Promise<StaffUserRow | undefined> {
  const [u] = await db()
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);
  return u;
}

export async function getStaffById(id: string): Promise<StaffUserRow | undefined> {
  const [u] = await db().select().from(users).where(eq(users.id, id)).limit(1);
  return u;
}

export async function listStaff(): Promise<StaffUserRow[]> {
  return db().select().from(users).orderBy(asc(users.status), asc(users.name));
}

/** Adds someone. They stay "invited" until they set a password. */
export async function createStaff(input: {
  email: string;
  name: string;
  role: Role;
}): Promise<string> {
  const id = randomUUID();
  await db()
    .insert(users)
    .values({
      id,
      email: normalizeEmail(input.email),
      name: input.name.trim(),
      role: input.role,
      status: "invited",
    });
  return id;
}

/** Email + password check. Same answer and timing whether or not the email exists. */
export async function checkPassword(email: string, password: string): Promise<Staff | null> {
  const u = await findStaffByEmail(email);
  if (!u || !u.passwordHash || u.status !== "active") {
    await dummyVerify(password);
    return null;
  }
  return (await verifyPassword(password, u.passwordHash)) ? toStaff(u) : null;
}

export async function setPassword(userId: string, password: string): Promise<void> {
  const passwordHash = await hashPassword(password);
  await db()
    .update(users)
    .set({ passwordHash, status: sql`if(${users.status} = 'invited', 'active', ${users.status})` })
    .where(eq(users.id, userId));
}

// ---- Sessions ----

/** Signs someone in. Returns the cookie value; only its hash is stored. */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db()
    .insert(sessions)
    .values({ tokenHash: hashToken(token), userId, expiresAt });
  await db()
    .update(users)
    .set({ lastLoginAt: sql`now()` })
    .where(eq(users.id, userId));
  return { token, expiresAt };
}

/** The person behind a session cookie, if the session is current and their access is active. */
export async function getSessionStaff(token: string): Promise<Staff | null> {
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
  return row ? toStaff(row.user) : null;
}

export async function deleteSession(token: string): Promise<void> {
  await db()
    .delete(sessions)
    .where(eq(sessions.tokenHash, hashToken(token)));
}

/** Signs someone out everywhere (except, optionally, the current browser). */
export async function deleteUserSessions(userId: string, keepToken?: string): Promise<void> {
  const where = keepToken
    ? and(eq(sessions.userId, userId), ne(sessions.tokenHash, hashToken(keepToken)))
    : eq(sessions.userId, userId);
  await db().delete(sessions).where(where);
  if (Math.random() < 0.05)
    await db()
      .delete(sessions)
      .where(lt(sessions.expiresAt, sql`now()`));
}

// ---- One-time links ----

/** Creates a link token. Any earlier unused link of the same kind for this person stops working. */
export async function issueToken(userId: string, purpose: TokenPurpose): Promise<string> {
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
      expiresAt: new Date(Date.now() + TOKEN_MINUTES[purpose] * 60 * 1000),
    });
  return token;
}

/** Looks at a link without using it up (for the confirm page). */
export async function peekToken(
  token: string,
  purposes: TokenPurpose[],
): Promise<{ user: StaffUserRow; purpose: TokenPurpose } | null> {
  const [row] = await db()
    .select({ user: users, purpose: tokens.purpose })
    .from(tokens)
    .innerJoin(users, eq(users.id, tokens.userId))
    .where(
      and(
        eq(tokens.tokenHash, hashToken(token)),
        inArray(tokens.purpose, purposes),
        isNull(tokens.usedAt),
        gt(tokens.expiresAt, sql`now()`),
        ne(users.status, "disabled"),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Uses a link up. Atomic: of two simultaneous uses, only one succeeds. */
export async function consumeToken(
  token: string,
  purposes: TokenPurpose[],
): Promise<{ user: StaffUserRow; purpose: TokenPurpose } | null> {
  const found = await peekToken(token, purposes);
  if (!found) return null;
  const [res] = await db()
    .update(tokens)
    .set({ usedAt: sql`now()` })
    .where(and(eq(tokens.tokenHash, hashToken(token)), isNull(tokens.usedAt)));
  return res.affectedRows === 1 ? found : null;
}

// ---- Roles and access (owners only; checked by the caller) ----

export class LastOwnerError extends Error {
  constructor() {
    super("Studio needs at least one owner. Make someone else an owner first.");
  }
}

/** Whether Studio has at least one owner who can sign in. */
export async function hasActiveOwner(): Promise<boolean> {
  return (await activeOwnerCount()) > 0;
}

async function activeOwnerCount(): Promise<number> {
  const [row] = await db()
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.role, "owner"), eq(users.status, "active")));
  return row.n;
}

async function isLastActiveOwner(userId: string): Promise<boolean> {
  const u = await getStaffById(userId);
  return !!u && u.role === "owner" && u.status === "active" && (await activeOwnerCount()) <= 1;
}

export async function changeRole(userId: string, role: Role): Promise<void> {
  if (role !== "owner" && (await isLastActiveOwner(userId))) throw new LastOwnerError();
  await db().update(users).set({ role }).where(eq(users.id, userId));
}

/** Removes access (and signs them out everywhere), or gives it back. */
export async function setAccess(userId: string, access: "disabled" | "restore"): Promise<void> {
  if (access === "disabled") {
    if (await isLastActiveOwner(userId)) throw new LastOwnerError();
    await db().update(users).set({ status: "disabled" }).where(eq(users.id, userId));
    await deleteUserSessions(userId);
    await db().delete(tokens).where(eq(tokens.userId, userId));
    return;
  }
  // Back to active if they had set a password, otherwise invited again.
  await db()
    .update(users)
    .set({ status: sql`if(${users.passwordHash} is null, 'invited', 'active')` })
    .where(eq(users.id, userId));
}
