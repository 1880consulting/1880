/**
 * Adds a demo client to the portal, for trying it out and for reviews:
 * "Demo Client" at <portal>/demo, with one person, plus a second client
 * ("Northwind") that person can't see, so isolation is easy to check by hand.
 * Prints a sign-in link. Safe to run again.
 *
 *   npm run portal:seed
 *   npm run portal:seed -- --email you@example.com --name "Your Name"
 *
 * Uses DATABASE_URL (from .env.local, or the local Docker database).
 */
import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { closeDb, db, schema } from "@/lib/db";
import { addPerson, createTenant } from "@/lib/portal/manage";
import { issueClientToken } from "@/lib/portal/users";
import { parsePortalSubdomain } from "@/lib/routing";

const { values } = parseArgs({
  options: { email: { type: "string" }, name: { type: "string" } },
});
const email = values.email?.trim() || "demo@example.com";
const name = values.name?.trim() || "Dana Demo";

async function tenant(slug: string, name: string, accentColor: string) {
  const [found] = await db()
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, slug))
    .limit(1);
  return found?.id ?? (await createTenant({ name, slug, accentColor }));
}

try {
  const demo = await tenant("demo", "Demo Client", "#1f6feb");
  const northwind = await tenant("northwind", "Northwind", "#b35900");
  const { userId } = await addPerson(demo, { email, name }, "seed");
  await addPerson(northwind, { email: "nora@northwind.example", name: "Nora North" }, "seed");
  const token = await issueClientToken(userId, "invite");
  const sub = parsePortalSubdomain(process.env.PORTAL_SUBDOMAIN);
  const origin =
    process.env.PORTAL_URL ??
    (process.env.SITE_URL
      ? new URL(process.env.SITE_URL).origin.replace("://", `://${sub}.`)
      : `http://${sub}.localhost:3000`);
  console.info(`Demo client ready: ${origin}/demo`);
  console.info(`Sign in as ${name} <${email}> (works once, for 7 days):`);
  console.info(`${origin}/auth?token=${token}&next=%2Fdemo`);
} finally {
  await closeDb();
}
