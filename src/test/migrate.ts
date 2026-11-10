import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

/** Vitest global setup: bring the test database up to date. Without MySQL, database tests skip. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL || "mysql://studio:studio@127.0.0.1:3306/studio_test";
  let conn: mysql.Connection | undefined;
  try {
    conn = await mysql.createConnection({ uri: url, connectTimeout: 3000 });
  } catch {
    console.warn(
      `[tests] No MySQL at ${url.replace(/:[^:@/]+@/, ":***@")}: database tests will be skipped.`,
    );
    return;
  }
  await migrate(drizzle(conn), { migrationsFolder: "./drizzle" });
  await conn.end();
}
