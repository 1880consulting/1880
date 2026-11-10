import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createSession as createStaffSession, createStaff } from "@/cms/staff/service";
import { db, schema } from "@/lib/db";
import { setupTestDatabase } from "@/test/db";
import { clientAreaFor, clientAreasFor } from "./access";
import { portalGate } from "./gate";
import { addPerson, createTenant, removePerson, setTenantStatus } from "./manage";
import {
  consumeClientToken,
  createClientSession,
  issueClientToken,
  peekClientToken,
} from "./users";

/**
 * The isolation suite (PLAN §2.3 point 8): proof that a person from client A
 * can never reach client B. It must pass before any real client data goes in,
 * and it runs on every pull request. Phase 4 extends it to documents and files.
 */

setupTestDatabase();

async function world() {
  const acme = await createTenant({ name: "Acme", slug: "acme" });
  const beta = await createTenant({ name: "Beta", slug: "beta" });
  const { userId: ada } = await addPerson(acme, { email: "ada@acme.test", name: "Ada" }, "staff");
  const { userId: bob } = await addPerson(beta, { email: "bob@beta.test", name: "Bob" }, "staff");
  const { userId: cy } = await addPerson(acme, { email: "cy@both.test", name: "Cy" }, "staff");
  await addPerson(beta, { email: "cy@both.test", name: "Cy" }, "staff");
  const session = async (userId: string) => (await createClientSession(userId)).token;
  return { acme, beta, ada, bob, cy, session };
}

describe("client isolation", () => {
  it("lets a person into their own client and nobody else's", async () => {
    const w = await world();
    const ada = await w.session(w.ada);
    const bob = await w.session(w.bob);
    expect(await portalGate(ada, "acme")).toBe("ok");
    expect(await portalGate(ada, "beta")).toBe("not-found");
    expect(await portalGate(bob, "beta")).toBe("ok");
    expect(await portalGate(bob, "acme")).toBe("not-found");
    expect(await clientAreaFor(w.ada, "beta")).toBeNull();
    expect((await clientAreasFor(w.ada)).map((c) => c.slug)).toEqual(["acme"]);
  });

  it("answers the same for an unknown client as for someone else's", async () => {
    const w = await world();
    const ada = await w.session(w.ada);
    expect(await portalGate(ada, "beta")).toBe("not-found");
    expect(await portalGate(ada, "no-such-client")).toBe("not-found");
  });

  it("lets someone invited to two clients see both, and only those", async () => {
    const w = await world();
    await createTenant({ name: "Gamma", slug: "gamma" });
    const cy = await w.session(w.cy);
    expect(await portalGate(cy, "acme")).toBe("ok");
    expect(await portalGate(cy, "beta")).toBe("ok");
    expect(await portalGate(cy, "gamma")).toBe("not-found");
    expect((await clientAreasFor(w.cy)).map((c) => c.slug)).toEqual(["acme", "beta"]);
  });

  it("asks for sign-in without a valid session, whatever the client", async () => {
    await world();
    for (const slug of ["acme", "beta", "no-such-client"]) {
      expect(await portalGate(undefined, slug)).toBe("sign-in");
      expect(await portalGate("made-up-token", slug)).toBe("sign-in");
    }
  });

  it("does not accept a Studio session as a portal session", async () => {
    await world();
    const staffId = await createStaff({ email: "drew@1880.test", name: "Drew", role: "owner" });
    await db()
      .update(schema.staffUsers)
      .set({ status: "active" })
      .where(eq(schema.staffUsers.id, staffId));
    const { token } = await createStaffSession(staffId);
    expect(await portalGate(token, "acme")).toBe("sign-in");
  });

  it("ends access at once when a client is archived", async () => {
    const w = await world();
    const ada = await w.session(w.ada);
    await setTenantStatus(w.acme, "archived");
    expect(await portalGate(ada, "acme")).toBe("not-found");
    expect(await clientAreasFor(w.ada)).toEqual([]);
    await setTenantStatus(w.acme, "active");
    expect(await portalGate(ada, "acme")).toBe("ok");
  });

  it("ends access at once when someone is removed, and signs them out with their last client", async () => {
    const w = await world();
    const cy = await w.session(w.cy);
    await removePerson(w.acme, w.cy);
    expect(await portalGate(cy, "acme")).toBe("not-found");
    expect(await portalGate(cy, "beta")).toBe("ok");
    const link = await issueClientToken(w.cy, "login");
    await removePerson(w.beta, w.cy);
    expect(await portalGate(cy, "beta")).toBe("sign-in");
    expect(await peekClientToken(link)).toBeNull();
  });

  it("refuses expired sessions and people whose access was turned off", async () => {
    const w = await world();
    const ada = await w.session(w.ada);
    await db()
      .update(schema.clientSessions)
      .set({ expiresAt: sql`now() - interval 1 minute` });
    expect(await portalGate(ada, "acme")).toBe("sign-in");
    const fresh = await w.session(w.ada);
    await db()
      .update(schema.clientUsers)
      .set({ status: "disabled" })
      .where(eq(schema.clientUsers.id, w.ada));
    expect(await portalGate(fresh, "acme")).toBe("sign-in");
  });

  it("uses sign-in links once, and only before they expire", async () => {
    const w = await world();
    const link = await issueClientToken(w.ada, "login");
    expect((await peekClientToken(link))?.id).toBe(w.ada);
    expect((await consumeClientToken(link))?.id).toBe(w.ada);
    expect(await consumeClientToken(link)).toBeNull();

    const old = await issueClientToken(w.ada, "login");
    const newer = await issueClientToken(w.ada, "login");
    expect(await peekClientToken(old)).toBeNull(); // a new link replaces the old one
    await db()
      .update(schema.clientTokens)
      .set({ expiresAt: sql`now() - interval 1 minute` });
    expect(await consumeClientToken(newer)).toBeNull();
  });
});

describe("portal code structure", () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
    });

  it("portal pages read data only through src/lib/portal", () => {
    for (const file of [...files("src/app/(portal)"), ...files("src/portal")]) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/from "@\/lib\/db|from "drizzle-orm|@\/cms\/media\/store/);
    }
  });

  it("sets no cookie for a parent domain (host-only cookies)", () => {
    for (const file of ["src/lib/portal/auth.ts", "src/cms/auth.ts"]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/\bdomain\s*:/);
    }
  });
});
