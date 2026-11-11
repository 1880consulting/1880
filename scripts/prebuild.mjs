/**
 * Before `next build`: bring the database up to date (Hostinger runs plain
 * `npm run build`). When two apps share one database (1880.io and
 * hub.1880.io), only one should do this: set SKIP_MIGRATIONS=1 on the other,
 * so they never run migrations at the same moment.
 */
import { spawnSync } from "node:child_process";

if (["1", "true", "yes"].includes((process.env.SKIP_MIGRATIONS ?? "").toLowerCase())) {
  console.log("SKIP_MIGRATIONS is set: leaving the database to the other app.");
} else {
  const r = spawnSync("npm", ["run", "db:migrate"], { stdio: "inherit" });
  process.exit(r.status ?? 1);
}
