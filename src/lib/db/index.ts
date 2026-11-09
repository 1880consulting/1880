import "server-only";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

/** The local Docker database (docker-compose.yml). Used only outside production. */
export const LOCAL_DATABASE_URL = "mysql://studio:studio@127.0.0.1:3306/studio";

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is not set.");
  return LOCAL_DATABASE_URL;
}

// One pool per server process (kept on globalThis so dev reloads don't open new ones).
const g = globalThis as unknown as { __db?: MySql2Database<typeof schema>; __pool?: mysql.Pool };

export function db(): MySql2Database<typeof schema> {
  if (!g.__db) {
    g.__pool = mysql.createPool({ uri: databaseUrl(), connectionLimit: 5, timezone: "Z" });
    g.__db = drizzle(g.__pool, { schema, mode: "default" });
  }
  return g.__db;
}

/** Closes the pool (tests and scripts; the app keeps it open). */
export async function closeDb(): Promise<void> {
  await g.__pool?.end();
  g.__pool = undefined;
  g.__db = undefined;
}

export { schema };
