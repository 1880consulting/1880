import {
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
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
