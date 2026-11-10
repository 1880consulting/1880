import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { TenantRow } from "@/lib/db/schema";
import { isValidClientName } from "@/lib/routing";
import { deleteClientUserSessions, ensureClientUser } from "./users";

/**
 * Managing clients and their people from 1880 Studio (PLAN §3.4). Callers
 * check that a staff member is signed in (requireStaff) first.
 */

const { tenants, memberships, clientUsers, clientTokens } = schema;

export type { TenantRow };

export interface TenantSummary extends TenantRow {
  people: number;
}

export async function listTenants(): Promise<TenantSummary[]> {
  const rows = await db()
    .select({ tenant: tenants, people: count(memberships.clientUserId) })
    .from(tenants)
    .leftJoin(memberships, eq(memberships.tenantId, tenants.id))
    .groupBy(tenants.id)
    .orderBy(asc(tenants.status), asc(tenants.name));
  return rows.map((r) => ({ ...r.tenant, people: r.people }));
}

export async function getTenant(id: string): Promise<TenantRow | undefined> {
  const [t] = await db().select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return t;
}

export class ClientNameError extends Error {}

const HEX = /^#[0-9a-f]{6}$/;

/** Checks a URL name and makes sure no other client has it. */
async function checkSlug(slug: string, exceptId?: string): Promise<void> {
  if (!isValidClientName(slug))
    throw new ClientNameError(
      "Use lowercase letters, numbers and single hyphens, like acme-co. Some words are reserved.",
    );
  const [taken] = await db().select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  if (taken && taken.id !== exceptId)
    throw new ClientNameError(`Another client (${taken.name}) already uses that URL name.`);
}

export interface TenantInput {
  name: string;
  slug: string;
  accentColor?: string | null;
  logoMediaId?: string | null;
}

const cleanColor = (c?: string | null) => (c && HEX.test(c.toLowerCase()) ? c.toLowerCase() : null);

export async function createTenant(input: TenantInput): Promise<string> {
  await checkSlug(input.slug);
  const id = randomUUID();
  await db()
    .insert(tenants)
    .values({
      id,
      name: input.name.trim(),
      slug: input.slug,
      accentColor: cleanColor(input.accentColor),
      logoMediaId: input.logoMediaId || null,
    });
  return id;
}

export async function updateTenant(id: string, input: TenantInput): Promise<void> {
  await checkSlug(input.slug, id);
  await db()
    .update(tenants)
    .set({
      name: input.name.trim(),
      slug: input.slug,
      accentColor: cleanColor(input.accentColor),
      logoMediaId: input.logoMediaId || null,
    })
    .where(eq(tenants.id, id));
}

/** Archived clients disappear from the portal for everyone; restoring brings them back. */
export async function setTenantStatus(id: string, status: "active" | "archived"): Promise<void> {
  await db().update(tenants).set({ status }).where(eq(tenants.id, id));
}

export interface TenantPerson {
  id: string;
  name: string;
  email: string;
  status: "active" | "disabled";
  lastLoginAt: Date | null;
  addedAt: Date;
}

export async function listTenantPeople(tenantId: string): Promise<TenantPerson[]> {
  return db()
    .select({
      id: clientUsers.id,
      name: clientUsers.name,
      email: clientUsers.email,
      status: clientUsers.status,
      lastLoginAt: clientUsers.lastLoginAt,
      addedAt: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(clientUsers, eq(clientUsers.id, memberships.clientUserId))
    .where(eq(memberships.tenantId, tenantId))
    .orderBy(asc(clientUsers.name));
}

/**
 * Gives someone access to a client, adding them if they're new. Returns their
 * id, and whether they already had access.
 */
export async function addPerson(
  tenantId: string,
  input: { email: string; name: string },
  invitedBy: string,
): Promise<{ userId: string; already: boolean }> {
  const userId = await ensureClientUser(input);
  const [res] = await db()
    .insert(memberships)
    .ignore()
    .values({ clientUserId: userId, tenantId, invitedBy });
  // A returning person whose access was turned off gets it back.
  await db().update(clientUsers).set({ status: "active" }).where(eq(clientUsers.id, userId));
  return { userId, already: res.affectedRows === 0 };
}

/**
 * Takes away someone's access to a client. If it was their last client, they
 * are signed out everywhere and their unused links stop working.
 */
export async function removePerson(tenantId: string, userId: string): Promise<void> {
  await db()
    .delete(memberships)
    .where(and(eq(memberships.tenantId, tenantId), eq(memberships.clientUserId, userId)));
  const [left] = await db()
    .select({ n: count() })
    .from(memberships)
    .where(eq(memberships.clientUserId, userId));
  if (left.n === 0) {
    await deleteClientUserSessions(userId);
    await db().delete(clientTokens).where(eq(clientTokens.userId, userId));
  }
}

/** Whether a person belongs to this client (for Studio actions on one row). */
export async function isMember(tenantId: string, userId: string): Promise<boolean> {
  const [row] = await db()
    .select({ one: sql`1` })
    .from(memberships)
    .where(and(eq(memberships.tenantId, tenantId), eq(memberships.clientUserId, userId)))
    .limit(1);
  return !!row;
}
