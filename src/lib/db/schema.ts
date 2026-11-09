import {
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

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
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_log_time").on(t.createdAt), index("audit_log_actor").on(t.actorId)],
);
