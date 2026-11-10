import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { TenantRow } from "@/lib/db/schema";

/**
 * Which clients a person may see (PLAN §2.3). The one place that answers
 * "can this person open this client?". An unknown client, an archived one and
 * one they don't belong to all answer the same: null.
 */

const { tenants, memberships } = schema;

export interface ClientArea {
  id: string;
  slug: string;
  name: string;
  logoMediaId: string | null;
  accentColor: string | null;
}

const toArea = (t: TenantRow): ClientArea => ({
  id: t.id,
  slug: t.slug,
  name: t.name,
  logoMediaId: t.logoMediaId,
  accentColor: t.accentColor,
});

/** The client at `slug`, if this person belongs to it and it's active. */
export async function clientAreaFor(userId: string, slug: string): Promise<ClientArea | null> {
  const [row] = await db()
    .select({ tenant: tenants })
    .from(memberships)
    .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
    .where(
      and(
        eq(memberships.clientUserId, userId),
        eq(tenants.slug, slug),
        eq(tenants.status, "active"),
      ),
    )
    .limit(1);
  return row ? toArea(row.tenant) : null;
}

/** Every active client this person belongs to, by name. */
export async function clientAreasFor(userId: string): Promise<ClientArea[]> {
  const rows = await db()
    .select({ tenant: tenants })
    .from(memberships)
    .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
    .where(and(eq(memberships.clientUserId, userId), eq(tenants.status, "active")))
    .orderBy(asc(tenants.name));
  return rows.map((r) => toArea(r.tenant));
}
