/**
 * Creates (or recovers) a 1880 Studio owner and prints a one-time link to set
 * their password. Use it once to create the first owner, and again if
 * everyone is ever locked out.
 *
 *   npm run studio:owner -- --email drew@1880consulting.com --name "Drew Jenkinson"
 *
 * Uses DATABASE_URL (from .env.local, or the local Docker database).
 */
import { parseArgs } from "node:util";
import { z } from "zod";
import { audit } from "@/cms/audit";
import {
  changeRole,
  createStaff,
  findStaffByEmail,
  issueToken,
  setAccess,
} from "@/cms/staff/service";
import { closeDb } from "@/lib/db";

const { values } = parseArgs({ options: { email: { type: "string" }, name: { type: "string" } } });
const email = z.email().safeParse(values.email?.trim());
if (!email.success) {
  console.error('Usage: npm run studio:owner -- --email you@1880consulting.com --name "Your Name"');
  process.exit(1);
}

try {
  let user = await findStaffByEmail(email.data);
  if (!user) {
    if (!values.name?.trim()) {
      console.error('New owner: add --name "Their Name" too.');
      process.exit(1);
    }
    await createStaff({ email: email.data, name: values.name, role: "owner" });
    user = (await findStaffByEmail(email.data))!;
    console.log(`Created owner ${user.name} <${user.email}>.`);
  } else {
    await changeRole(user.id, "owner");
    if (user.status === "disabled") await setAccess(user.id, "restore");
    user = (await findStaffByEmail(email.data))!;
    console.log(`${user.name} <${user.email}> is an owner.`);
  }

  const purpose = user.passwordHash ? "reset" : "invite";
  const token = await issueToken(user.id, purpose);
  const origin = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  await audit({ actor: { type: "system" }, action: "staff.owner_link_issued", target: user.email });

  console.log(
    `\nOpen this link to ${purpose === "invite" ? "set" : "reset"} the password (works once):\n`,
  );
  console.log(`  ${origin}/admin/set-password?token=${token}\n`);
  console.log(`It expires in ${purpose === "invite" ? "7 days" : "60 minutes"}.`);
} finally {
  await closeDb();
}
