import "server-only";
import { and, desc, eq, gte, inArray, isNotNull, lt, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { STUDIO } from "../_entries/config";

/**
 * Studio's activity, as plain sentences (PLAN D50): "Drew published the page
 * “About”". Reads the activity log (src/cms/audit.ts) and looks up the names
 * of the people and things involved in a few batched queries.
 */

const { auditLog, staffUsers, clientUsers, entries, entryVersions, documents, documentVersions } =
  schema;
const { tenants, media, inquiries } = schema;

export interface ActivityItem {
  id: number;
  at: Date;
  /** Who did it: a Studio person's name, "A client: <name>", or "Studio" for the system. */
  who: string;
  actorType: "staff" | "client" | "system";
  /** What happened, after the name: "published the page “About”". */
  what: string;
  /** Where to look, if the thing still exists. */
  href?: string;
  action: string;
}

/** Which records count as content changes, for the Overview's feed. */
export const CONTENT_ACTIONS = [
  "page.%",
  "work.%",
  "service.%",
  "document.%",
  "media.%",
  "menus.%",
  "client.created",
  "client.updated",
  "client.archived",
  "client.restored",
  "client.person_invited",
  "client.person_removed",
  "staff.invited",
];

export interface ActivityFilter {
  /** "staff:<id>", "client" (any hub user) or "system". */
  who?: string;
  from?: Date;
  /** Up to (not including) this moment. */
  to?: Date;
  /** Only content changes (the Overview), or everything (the activity log). */
  contentOnly?: boolean;
  /** Older than this id (paging). */
  before?: number;
  limit?: number;
}

export async function listActivity(f: ActivityFilter = {}): Promise<ActivityItem[]> {
  const conds = [];
  if (f.who?.startsWith("staff:")) {
    conds.push(eq(auditLog.actorType, "staff"), eq(auditLog.actorId, f.who.slice(6)));
  } else if (f.who === "client") conds.push(eq(auditLog.actorType, "client"));
  else if (f.who === "system") conds.push(eq(auditLog.actorType, "system"));
  if (f.from) conds.push(gte(auditLog.createdAt, f.from));
  if (f.to) conds.push(lt(auditLog.createdAt, f.to));
  if (f.before) conds.push(lt(auditLog.id, f.before));
  if (f.contentOnly)
    conds.push(
      or(
        ...CONTENT_ACTIONS.map((a) =>
          a.endsWith("%") ? sql`${auditLog.action} like ${a}` : eq(auditLog.action, a),
        ),
      ),
    );
  const rows = await db()
    .select()
    .from(auditLog)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(auditLog.id))
    .limit(Math.min(f.limit ?? 50, 500));
  return describeAll(rows);
}

type AuditRow = typeof auditLog.$inferSelect;

const uuid = /^[0-9a-f-]{36}$/;
const ids = (rows: AuditRow[], test: (r: AuditRow) => boolean, pick: (r: AuditRow) => unknown) => [
  ...new Set(
    rows
      .filter(test)
      .map(pick)
      .filter((v): v is string => typeof v === "string" && uuid.test(v)),
  ),
];

async function describeAll(rows: AuditRow[]): Promise<ActivityItem[]> {
  if (!rows.length) return [];
  const prefix = (r: AuditRow) => r.action.split(".")[0];
  const staffIds = ids(
    rows,
    (r) => r.actorType === "staff",
    (r) => r.actorId,
  );
  const clientUserIds = ids(
    rows,
    (r) => r.actorType === "client",
    (r) => r.actorId,
  );
  const entryIds = ids(
    rows,
    (r) => ["page", "work", "service"].includes(prefix(r)),
    (r) => r.target,
  );
  const docIds = ids(
    rows,
    (r) => prefix(r) === "document",
    (r) => r.target,
  );
  const tenantIds = ids(
    rows,
    (r) => !!r.tenantId,
    (r) => r.tenantId,
  );
  const mediaIds = ids(
    rows,
    (r) => prefix(r) === "media",
    (r) => r.target,
  );
  const inquiryIds = ids(
    rows,
    (r) => prefix(r) === "inquiry",
    (r) => r.target,
  );

  const [staff, clientPeople, entryRows, docRows, tenantRows, mediaRows, inquiryRows] =
    await Promise.all([
      staffIds.length
        ? db()
            .select({ id: staffUsers.id, name: staffUsers.name })
            .from(staffUsers)
            .where(inArray(staffUsers.id, staffIds))
        : [],
      clientUserIds.length
        ? db()
            .select({ id: clientUsers.id, name: clientUsers.name })
            .from(clientUsers)
            .where(inArray(clientUsers.id, clientUserIds))
        : [],
      entryIds.length
        ? db()
            .select({ id: entries.id, type: entries.type, doc: entryVersions.doc })
            .from(entries)
            .innerJoin(entryVersions, eq(entryVersions.id, entries.draftVersionId))
            .where(inArray(entries.id, entryIds))
        : [],
      docIds.length
        ? db()
            .select({ id: documents.id, tenantId: documents.tenantId, doc: documentVersions.doc })
            .from(documents)
            .innerJoin(documentVersions, eq(documentVersions.id, documents.draftVersionId))
            .where(inArray(documents.id, docIds))
        : [],
      tenantIds.length
        ? db()
            .select({ id: tenants.id, name: tenants.name })
            .from(tenants)
            .where(inArray(tenants.id, tenantIds))
        : [],
      mediaIds.length
        ? db()
            .select({ id: media.id, filename: media.filename })
            .from(media)
            .where(inArray(media.id, mediaIds))
        : [],
      inquiryIds.length
        ? db()
            .select({ id: inquiries.id, name: inquiries.name })
            .from(inquiries)
            .where(inArray(inquiries.id, inquiryIds))
        : [],
    ]);
  const name = new Map(staff.map((s) => [s.id, s.name]));
  const clientName = new Map(clientPeople.map((s) => [s.id, s.name]));
  const entry = new Map(
    entryRows.map((e) => [e.id, { type: e.type, title: (e.doc as { title?: string }).title }]),
  );
  const doc = new Map(
    docRows.map((d) => [
      d.id,
      { tenantId: d.tenantId, title: (d.doc as { title?: string }).title },
    ]),
  );
  const tenant = new Map(tenantRows.map((t) => [t.id, t.name]));
  const file = new Map(mediaRows.map((m) => [m.id, m.filename]));
  const inquiry = new Map(inquiryRows.map((i) => [i.id, i.name]));

  return rows.map((r): ActivityItem => {
    const who =
      r.actorType === "staff"
        ? (r.actorId && name.get(r.actorId)) || "A former team member"
        : r.actorType === "client"
          ? `${(r.actorId && clientName.get(r.actorId)) || "A client"} (hub)`
          : "Studio";
    const [kind, verb] = r.action.split(".");
    const q = (s?: string | null) => `“${s || "Untitled"}”`;
    const client = r.tenantId ? tenant.get(r.tenantId) : undefined;
    const base = { id: r.id, at: r.createdAt, who, actorType: r.actorType, action: r.action };

    // Pages, case studies, services.
    if (kind === "page" || kind === "work" || kind === "service") {
      const cfg = STUDIO[kind];
      const e = r.target ? entry.get(r.target) : undefined;
      const thing = e ? `the ${cfg.singular} ${q(e.title)}` : `a ${cfg.singular}`;
      const href = e && r.target ? `${cfg.base}/${r.target}` : undefined;
      const verbs: Record<string, string> = {
        created: `created ${thing}`,
        published: `published ${thing}`,
        unpublished: `unpublished ${thing}`,
        deleted: `deleted ${thing}`,
        version_restored: `restored an earlier version of ${thing}`,
      };
      return { ...base, what: verbs[verb] ?? `${verb.replace(/_/g, " ")} ${thing}`, href };
    }

    if (kind === "document") {
      const d = r.target ? doc.get(r.target) : undefined;
      const owner = d ? tenant.get(d.tenantId) : client;
      const thing = `${d ? `the document ${q(d.title)}` : "a document"}${owner ? ` for ${owner}` : ""}`;
      const href = d && r.target ? `/admin/clients/${d.tenantId}/documents/${r.target}` : undefined;
      const verbs: Record<string, string> = {
        created: `created ${thing}`,
        published: `published ${thing}`,
        unpublished: `unpublished ${thing}`,
        deleted: `deleted ${thing}`,
        file_uploaded: `uploaded a file to ${thing}`,
        attachment_deleted: `removed an attachment from ${thing}`,
        version_restored: `restored an earlier version of ${thing}`,
      };
      return { ...base, what: verbs[verb] ?? `${verb.replace(/_/g, " ")} ${thing}`, href };
    }

    if (kind === "client") {
      const c = client ? `the client ${client}` : "a client";
      const href = r.tenantId && client ? `/admin/clients/${r.tenantId}` : undefined;
      const verbs: Record<string, string> = {
        created: `added ${c}`,
        updated: `updated ${c}`,
        archived: `archived ${c}`,
        restored: `restored ${c}`,
        person_invited: `invited ${r.target ?? "someone"} to ${client ?? "a client"}`,
        invite_resent: `resent an invite for ${client ?? "a client"}`,
        person_removed: `removed someone's access to ${client ?? "a client"}`,
        sign_in: "signed in to the hub",
        sign_out: "signed out of the hub",
        link_sent: "asked for a hub sign-in link",
      };
      return { ...base, what: verbs[verb] ?? r.action, href };
    }

    if (kind === "media") {
      const f = r.target ? file.get(r.target) : undefined;
      const thing = f ? `the image ${q(f)}` : "an image";
      const verbs: Record<string, string> = {
        uploaded: `uploaded ${thing}`,
        replaced: `replaced ${thing}`,
        deleted: `deleted ${thing}`,
      };
      const href = f && r.target ? `/admin/media/${r.target}` : undefined;
      return { ...base, what: verbs[verb] ?? r.action, href };
    }

    if (kind === "inquiry") {
      const from = r.target ? inquiry.get(r.target) : undefined;
      const thing = from ? `the inquiry from ${from}` : "an inquiry";
      const href = from && r.target ? `/admin/inquiries/${r.target}` : undefined;
      const what = verb === "spam" ? `marked ${thing} as spam` : `archived ${thing}`;
      return { ...base, what, href };
    }

    const fixed: Record<string, string> = {
      "menus.updated": "updated the menus and footer",
      "inquiries.exported": "exported inquiries to a spreadsheet",
      "staff.sign_in": "signed in",
      "staff.sign_out": "signed out",
      "staff.sign_in_failed": `had a failed sign-in for ${r.target ?? "an unknown address"}`,
      "staff.login_link_sent": "asked for a sign-in link",
      "staff.reset_link_sent": "asked to reset their password",
      "staff.password_reset": "reset their password",
      "staff.password_changed": "changed their password",
      "staff.invite_accepted": "joined Studio",
      "staff.invited": `invited ${r.target ?? "someone"} to Studio`,
      "staff.invite_resent": "resent a Studio invite",
      "staff.role_changed": "changed someone's role",
      "staff.access_removed": "removed someone's Studio access",
      "staff.access_restored": "gave someone their Studio access back",
      "staff.first_owner_created": "set up Studio",
      "staff.setup_refused": "refused a setup attempt with the wrong code",
      "preview.link_created": "shared a preview link",
      "preview.link_revoked": "turned off a preview link",
    };
    return { ...base, what: fixed[r.action] ?? r.action.replace(/[._]/g, " ") };
  });
}

/** People to filter by: everyone who has done something, by name. */
export async function activityPeople(): Promise<{ value: string; label: string }[]> {
  const people = await db()
    .select({ id: staffUsers.id, name: staffUsers.name })
    .from(staffUsers)
    .where(ne(staffUsers.status, "invited"))
    .orderBy(staffUsers.name);
  return [
    ...people.map((p) => ({ value: `staff:${p.id}`, label: p.name })),
    { value: "client", label: "Clients (hub)" },
    { value: "system", label: "Studio (automatic)" },
  ];
}

/** Drafts with changes not yet live: entries and client documents. For the Overview. */
export async function pendingDrafts(limit = 8) {
  const entryRows = await db()
    .select({
      id: entries.id,
      type: entries.type,
      status: entries.status,
      updatedAt: entries.updatedAt,
      updatedBy: entries.updatedBy,
      doc: entryVersions.doc,
    })
    .from(entries)
    .innerJoin(entryVersions, eq(entryVersions.id, entries.draftVersionId))
    .where(
      or(
        eq(entries.status, "draft"),
        and(
          isNotNull(entries.publishedVersionId),
          ne(entries.draftVersionId, entries.publishedVersionId),
        ),
      ),
    )
    .orderBy(desc(entries.updatedAt))
    .limit(limit);
  const docRows = await db()
    .select({
      id: documents.id,
      tenantId: documents.tenantId,
      status: documents.status,
      updatedAt: documents.updatedAt,
      doc: documentVersions.doc,
      client: tenants.name,
    })
    .from(documents)
    .innerJoin(documentVersions, eq(documentVersions.id, documents.draftVersionId))
    .innerJoin(tenants, eq(tenants.id, documents.tenantId))
    .where(
      or(
        eq(documents.status, "draft"),
        and(
          isNotNull(documents.publishedVersionId),
          ne(documents.draftVersionId, documents.publishedVersionId),
        ),
      ),
    )
    .orderBy(desc(documents.updatedAt))
    .limit(limit);
  const items = [
    ...entryRows.map((e) => {
      const cfg = STUDIO[e.type as keyof typeof STUDIO];
      return {
        key: e.id,
        title: (e.doc as { title?: string }).title || "Untitled",
        kind: cfg ? cfg.singular : e.type,
        live: e.status === "published",
        updatedAt: e.updatedAt,
        href: cfg ? `${cfg.base}/${e.id}` : "/admin",
      };
    }),
    ...docRows.map((d) => ({
      key: d.id,
      title: (d.doc as { title?: string }).title || "Untitled",
      kind: `document for ${d.client}`,
      live: d.status === "published",
      updatedAt: d.updatedAt,
      href: `/admin/clients/${d.tenantId}/documents/${d.id}`,
    })),
  ];
  return items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, limit);
}

/** The last seven days at a glance: things published, and hub documents opened. */
export async function weekNumbers(): Promise<{ published: number; opened: number }> {
  const since = sql`now() - interval 7 day`;
  const [pub] = await db()
    .select({ n: sql<number>`count(*)` })
    .from(auditLog)
    .where(and(sql`${auditLog.action} like '%.published'`, gte(auditLog.createdAt, since)));
  const [opened] = await db()
    .select({ n: sql<number>`count(*)` })
    .from(schema.documentEvents)
    .where(
      and(eq(schema.documentEvents.kind, "view"), gte(schema.documentEvents.createdAt, since)),
    );
  return { published: Number(pub.n), opened: Number(opened.n) };
}
