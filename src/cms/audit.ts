import "server-only";
import { db, schema } from "@/lib/db";

/** Records who did what in Studio (PLAN §2.3 point 9, D24). Never throws. */
export async function audit(entry: {
  actor: { type: "staff" | "client" | "system"; id?: string | null };
  action: string;
  target?: string;
  detail?: Record<string, unknown>;
  /** The client it was about (portal events). */
  tenantId?: string | null;
}): Promise<void> {
  try {
    await db()
      .insert(schema.auditLog)
      .values({
        actorType: entry.actor.type,
        actorId: entry.actor.id ?? null,
        action: entry.action,
        target: entry.target?.slice(0, 400),
        detail: entry.detail,
        tenantId: entry.tenantId ?? null,
      });
  } catch (err) {
    console.error("[audit] could not record", entry.action, err);
  }
}
