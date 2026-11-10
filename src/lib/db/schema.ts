import {
  customType,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

/**
 * Database tables. Change this file, then run `npm run db:generate` to create
 * a new numbered migration in drizzle/. Never edit a migration once shipped.
 */

/** Contact-form messages (PLAN D27). Saved before any email is sent, so no lead is lost. */
export const inquiries = mysqlTable(
  "inquiries",
  {
    id: varchar("id", { length: 36 }).primaryKey(), // random UUID, never 1, 2, 3
    name: varchar("name", { length: 200 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    message: text("message").notNull(),
    status: mysqlEnum("status", ["new", "read", "archived"]).notNull().default("new"),
    /** The alert email to the team: pending → sent, or failed/skipped (retryable). */
    alertStatus: mysqlEnum("alert_status", ["pending", "sent", "failed", "skipped"])
      .notNull()
      .default("pending"),
    alertAttempts: int("alert_attempts").notNull().default(0),
    alertError: varchar("alert_error", { length: 500 }),
    /** Set while a send is in flight, so two runs never email the same alert. */
    alertClaimedAt: timestamp("alert_claimed_at"),
    alertedAt: timestamp("alerted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    readAt: timestamp("read_at"),
  },
  (t) => [
    index("inquiries_status_created").on(t.status, t.createdAt),
    index("inquiries_alert").on(t.alertStatus, t.alertAttempts),
  ],
);

export type InquiryRow = typeof inquiries.$inferSelect;

/** Site-wide settings editors change in 1880 Studio, one JSON value per key. */
export const settings = mysqlTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: json("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ---------------------------------------------------------------------------
// Staff (1880 Studio sign-in, PLAN D21 + D24)
// ---------------------------------------------------------------------------

/** People who can use 1880 Studio. "invited" until they set a password. */
export const staffUsers = mysqlTable(
  "staff_users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }),
    role: mysqlEnum("role", ["owner", "editor"]).notNull().default("editor"),
    status: mysqlEnum("status", ["invited", "active", "disabled"]).notNull().default("invited"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at"),
  },
  (t) => [uniqueIndex("staff_users_email").on(t.email)],
);

export type StaffUserRow = typeof staffUsers.$inferSelect;

/** Signed-in browsers. Only a hash of the cookie's token is stored. */
export const staffSessions = mysqlTable(
  "staff_sessions",
  {
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [index("staff_sessions_user").on(t.userId)],
);

/** One-time links: sign-in (magic link), invite, password reset. Hash only. */
export const staffTokens = mysqlTable(
  "staff_tokens",
  {
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    purpose: mysqlEnum("purpose", ["login", "invite", "reset"]).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
  },
  (t) => [index("staff_tokens_user").on(t.userId, t.purpose)],
);

/** Rate-limit counters: one row per attempt, e.g. key "login:email:ada@x.com". */
export const rateLimits = mysqlTable(
  "rate_limits",
  {
    id: int("id").autoincrement().primaryKey(),
    key: varchar("key", { length: 400 }).notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).notNull().defaultNow(),
  },
  (t) => [index("rate_limits_key_time").on(t.key, t.createdAt)],
);

/** Who did what in Studio: sign-ins, invites, role changes and so on. */
export const auditLog = mysqlTable(
  "audit_log",
  {
    id: int("id").autoincrement().primaryKey(),
    actorType: mysqlEnum("actor_type", ["staff", "client", "system"]).notNull(),
    actorId: varchar("actor_id", { length: 36 }),
    action: varchar("action", { length: 64 }).notNull(),
    target: varchar("target", { length: 400 }),
    detail: json("detail"),
    /** The client this was about, for portal events (sign-ins, views, downloads). */
    tenantId: varchar("tenant_id", { length: 36 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_time").on(t.createdAt),
    index("audit_log_actor").on(t.actorId),
    index("audit_log_tenant").on(t.tenantId, t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Content (PLAN §3.2): entries, immutable versions, redirects
// ---------------------------------------------------------------------------

/**
 * One page (or later, case study, service…). Points at its current draft
 * version and its published version; both live in entry_versions.
 */
export const entries = mysqlTable(
  "entries",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    type: varchar("type", { length: 32 }).notNull(),
    /** Draft address, e.g. "about" → /about. The home page is "". */
    slug: varchar("slug", { length: 200 }).notNull(),
    /** Address of what's live, so a slug change can redirect the old one. */
    publishedSlug: varchar("published_slug", { length: 200 }),
    status: mysqlEnum("status", ["draft", "published", "archived"]).notNull().default("draft"),
    draftVersionId: varchar("draft_version_id", { length: 36 }),
    publishedVersionId: varchar("published_version_id", { length: 36 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
    updatedBy: varchar("updated_by", { length: 36 }),
    publishedAt: timestamp("published_at"),
  },
  (t) => [
    uniqueIndex("entries_type_slug").on(t.type, t.slug),
    index("entries_type_status").on(t.type, t.status),
  ],
);

export type EntryRow = typeof entries.$inferSelect;

/** Every save is a new row here, never changed afterwards (undo and history). */
export const entryVersions = mysqlTable(
  "entry_versions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    entryId: varchar("entry_id", { length: 36 }).notNull(),
    doc: json("doc").notNull(),
    authorId: varchar("author_id", { length: 36 }),
    /** What made this version: a save, a restore… */
    note: varchar("note", { length: 200 }),
    // Microseconds, so versions saved in the same second still sort in order.
    createdAt: timestamp("created_at", { fsp: 6 })
      .notNull()
      .default(sql`(now(6))`),
  },
  (t) => [index("entry_versions_entry").on(t.entryId, t.createdAt)],
);

export type EntryVersionRow = typeof entryVersions.$inferSelect;

/** Old address → new address. Added automatically when a published page moves. */
export const redirects = mysqlTable("redirects", {
  id: int("id").autoincrement().primaryKey(),
  fromPath: varchar("from_path", { length: 300 }).notNull().unique(),
  toPath: varchar("to_path", { length: 300 }).notNull(),
  code: int("code").notNull().default(308),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Media library (PLAN D26)
// ---------------------------------------------------------------------------

/** One image in the library. Its files live in the storage adapter, keyed by id and rev. */
export const media = mysqlTable(
  "media",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    filename: varchar("filename", { length: 255 }).notNull(),
    mime: varchar("mime", { length: 50 }).notNull(),
    width: int("width").notNull(),
    height: int("height").notNull(),
    bytes: int("bytes").notNull(),
    /** Fingerprint of the original, so the same file uploaded twice is stored once. */
    sha256: varchar("sha256", { length: 64 }).notNull(),
    alt: varchar("alt", { length: 300 }).notNull().default(""),
    /** Where crops center, 0–1000 from the left/top. */
    focalX: int("focal_x").notNull().default(500),
    focalY: int("focal_y").notNull().default(500),
    /** Bumped when the file is replaced, so addresses change and caches refresh. */
    rev: int("rev").notNull().default(1),
    /** Widths made for this revision, e.g. [320, 640, 960]. */
    widths: json("widths").notNull(),
    createdBy: varchar("created_by", { length: 36 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [index("media_sha256").on(t.sha256), index("media_created").on(t.createdAt)],
);

export type MediaRow = typeof media.$inferSelect;

/**
 * The MySQL storage adapter's files (PLAN §2.4: MySQL first, S3-compatible
 * storage later by config). Never written to disk: Hostinger wipes it.
 */
export const mediaBlobs = mysqlTable("media_blobs", {
  key: varchar("key", { length: 200 }).primaryKey(),
  contentType: varchar("content_type", { length: 50 }).notNull(),
  bytes: int("bytes").notNull(),
  data: customType<{ data: Buffer }>({ dataType: () => "longblob" })("data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Client portal (PLAN §2.3, §3.4). Portal pages read these only through
// src/lib/portal/, which checks membership and filters by tenant_id.
// ---------------------------------------------------------------------------

/** A client of 1880, at <portal>/<slug>. "archived" hides it from everyone. */
export const tenants = mysqlTable(
  "tenants",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    /** The URL name: clients.1880.io/<slug>. */
    slug: varchar("slug", { length: 63 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    /** A media-library image, shown only after sign-in. */
    logoMediaId: varchar("logo_media_id", { length: 36 }),
    /** One brand color, "#rrggbb", used as an accent on 1880's design. */
    accentColor: varchar("accent_color", { length: 7 }),
    status: mysqlEnum("status", ["active", "archived"]).notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("tenants_slug").on(t.slug)],
);

export type TenantRow = typeof tenants.$inferSelect;

/** A person at a client. One person can belong to several clients. */
export const clientUsers = mysqlTable(
  "client_users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    status: mysqlEnum("status", ["active", "disabled"]).notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at"),
  },
  (t) => [uniqueIndex("client_users_email").on(t.email)],
);

export type ClientUserRow = typeof clientUsers.$inferSelect;

/** Who can see which client. Removing the row removes access at once. */
export const memberships = mysqlTable(
  "memberships",
  {
    clientUserId: varchar("client_user_id", { length: 36 }).notNull(),
    tenantId: varchar("tenant_id", { length: 36 }).notNull(),
    invitedBy: varchar("invited_by", { length: 36 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.clientUserId, t.tenantId] }),
    index("memberships_tenant").on(t.tenantId),
  ],
);

/** Signed-in portal browsers. A separate cookie, on the portal's host only. */
export const clientSessions = mysqlTable(
  "client_sessions",
  {
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [index("client_sessions_user").on(t.userId)],
);

/** Emailed sign-in links for clients: "login" (15 minutes) or "invite" (7 days). Hash only. */
export const clientTokens = mysqlTable(
  "client_tokens",
  {
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    purpose: mysqlEnum("purpose", ["login", "invite"]).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
  },
  (t) => [index("client_tokens_user").on(t.userId, t.purpose)],
);

// ---------------------------------------------------------------------------
// Portal documents (PLAN §3.5): reports, proposals and others, in three
// formats. Every row carries tenant_id, and every portal query filters by it.
// ---------------------------------------------------------------------------

/** A report, proposal or other document for one client. */
export const documents = mysqlTable(
  "documents",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    tenantId: varchar("tenant_id", { length: 36 }).notNull(),
    kind: mysqlEnum("kind", ["report", "proposal", "other"]).notNull().default("report"),
    /** blocks: built in Studio. interactive: an uploaded HTML page. file: an uploaded PDF or other file. */
    format: mysqlEnum("format", ["blocks", "interactive", "file"]).notNull(),
    status: mysqlEnum("status", ["draft", "published"]).notNull().default("draft"),
    draftVersionId: varchar("draft_version_id", { length: 36 }),
    publishedVersionId: varchar("published_version_id", { length: 36 }),
    createdBy: varchar("created_by", { length: 36 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
    publishedAt: timestamp("published_at"),
  },
  (t) => [index("documents_tenant").on(t.tenantId, t.status, t.publishedAt)],
);

export type DocumentRow = typeof documents.$inferSelect;

/** Every save or upload is a new row here, never changed afterwards (history and undo). */
export const documentVersions = mysqlTable(
  "document_versions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    documentId: varchar("document_id", { length: 36 }).notNull(),
    tenantId: varchar("tenant_id", { length: 36 }).notNull(),
    /** Title, summary and blocks, plus the uploaded file's id for the other formats. */
    doc: json("doc").notNull(),
    authorId: varchar("author_id", { length: 36 }),
    note: varchar("note", { length: 200 }),
    createdAt: timestamp("created_at", { fsp: 6 })
      .notNull()
      .default(sql`(now(6))`),
  },
  (t) => [index("document_versions_doc").on(t.documentId, t.createdAt)],
);

/** An uploaded file: an interactive page, a document's file, or an attachment. Bytes live in storage. */
export const documentFiles = mysqlTable(
  "document_files",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    tenantId: varchar("tenant_id", { length: 36 }).notNull(),
    documentId: varchar("document_id", { length: 36 }).notNull(),
    purpose: mysqlEnum("purpose", ["interactive", "file", "attachment"]).notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    mime: varchar("mime", { length: 120 }).notNull(),
    bytes: int("bytes").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    createdBy: varchar("created_by", { length: 36 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("document_files_doc").on(t.documentId)],
);

export type DocumentFileRow = typeof documentFiles.$inferSelect;

/** Receipts: who opened or downloaded what, and when. */
export const documentEvents = mysqlTable(
  "document_events",
  {
    id: int("id").autoincrement().primaryKey(),
    documentId: varchar("document_id", { length: 36 }).notNull(),
    tenantId: varchar("tenant_id", { length: 36 }).notNull(),
    clientUserId: varchar("client_user_id", { length: 36 }).notNull(),
    kind: mysqlEnum("kind", ["view", "download"]).notNull(),
    fileId: varchar("file_id", { length: 36 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("document_events_doc").on(t.documentId, t.createdAt),
    index("document_events_user").on(t.clientUserId, t.tenantId, t.createdAt),
  ],
);
