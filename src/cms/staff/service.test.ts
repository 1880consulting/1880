import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { clearRateLimit, rateLimit } from "@/cms/rate-limit";
import { db, schema } from "@/lib/db";
import { setupTestDatabase } from "@/test/db";
import {
  changeRole,
  checkPassword,
  consumeToken,
  createSession,
  createStaff,
  deleteSession,
  deleteUserSessions,
  findStaffByEmail,
  getSessionStaff,
  issueToken,
  LastOwnerError,
  peekToken,
  setAccess,
  setPassword,
} from "./service";

setupTestDatabase();

const PW = "a long enough password";

async function activeStaff(email: string, role: "owner" | "editor" = "editor") {
  const id = await createStaff({ email, name: email.split("@")[0], role });
  await setPassword(id, PW);
  return id;
}

describe("staff accounts", () => {
  it("stores emails in lowercase and starts people as invited", async () => {
    const id = await createStaff({ email: "  Ada@Example.com ", name: " Ada ", role: "editor" });
    expect(await findStaffByEmail("ADA@example.com")).toMatchObject({
      id,
      name: "Ada",
      status: "invited",
      passwordHash: null,
    });
  });

  it("refuses a second account with the same email", async () => {
    await createStaff({ email: "ada@example.com", name: "Ada", role: "editor" });
    await expect(
      createStaff({ email: "ADA@example.com", name: "Ada 2", role: "editor" }),
    ).rejects.toThrow();
  });

  it("signs in only active people with the right password", async () => {
    const id = await createStaff({ email: "ada@example.com", name: "Ada", role: "editor" });
    expect(await checkPassword("ada@example.com", PW)).toBeNull(); // invited, no password yet
    await setPassword(id, PW);
    expect((await findStaffByEmail("ada@example.com"))?.status).toBe("active");
    expect(await checkPassword("ada@example.com", PW)).toMatchObject({ id, role: "editor" });
    expect(await checkPassword("ada@example.com", "wrong password here")).toBeNull();
    expect(await checkPassword("nobody@example.com", PW)).toBeNull();
    await setAccess(id, "disabled");
    expect(await checkPassword("ada@example.com", PW)).toBeNull();
  });
});

describe("sessions", () => {
  it("finds the person for a session, stores only a hash, and ends it", async () => {
    const id = await activeStaff("ada@example.com");
    const { token } = await createSession(id);
    expect(await getSessionStaff(token)).toMatchObject({ id });
    const [row] = await db().select().from(schema.staffSessions);
    expect(row.tokenHash).not.toBe(token);
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect((await findStaffByEmail("ada@example.com"))?.lastLoginAt).toBeInstanceOf(Date);

    await deleteSession(token);
    expect(await getSessionStaff(token)).toBeNull();
  });

  it("ignores expired sessions and sessions of people without access", async () => {
    const id = await activeStaff("ada@example.com");
    const a = await createSession(id);
    await db()
      .update(schema.staffSessions)
      .set({ expiresAt: new Date(Date.now() - 1000) });
    expect(await getSessionStaff(a.token)).toBeNull();

    const b = await createSession(id);
    await activeStaff("owner@example.com", "owner");
    await setAccess(id, "disabled");
    expect(await getSessionStaff(b.token)).toBeNull();
  });

  it("signs out everywhere except the current browser", async () => {
    const id = await activeStaff("ada@example.com");
    const here = await createSession(id);
    const there = await createSession(id);
    await deleteUserSessions(id, here.token);
    expect(await getSessionStaff(here.token)).not.toBeNull();
    expect(await getSessionStaff(there.token)).toBeNull();
  });
});

describe("one-time links", () => {
  it("work once, for the right purpose only", async () => {
    const id = await activeStaff("ada@example.com");
    const token = await issueToken(id, "login");
    expect(await peekToken(token, ["reset"])).toBeNull();
    expect(await peekToken(token, ["login"])).toMatchObject({ purpose: "login" });
    expect(await consumeToken(token, ["login"])).toMatchObject({ user: { id } });
    expect(await consumeToken(token, ["login"])).toBeNull();
  });

  it("can't be used twice even at the same moment", async () => {
    const id = await activeStaff("ada@example.com");
    const token = await issueToken(id, "login");
    const results = await Promise.all([1, 2, 3, 4].map(() => consumeToken(token, ["login"])));
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("expire, and a newer link replaces an older one", async () => {
    const id = await activeStaff("ada@example.com");
    const old = await issueToken(id, "reset");
    const fresh = await issueToken(id, "reset");
    expect(await peekToken(old, ["reset"])).toBeNull();
    expect(await peekToken(fresh, ["reset"])).not.toBeNull();
    await db()
      .update(schema.staffTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) });
    expect(await consumeToken(fresh, ["reset"])).toBeNull();
  });

  it("stop working when access is removed", async () => {
    const owner = await activeStaff("owner@example.com", "owner");
    void owner;
    const id = await createStaff({ email: "new@example.com", name: "New", role: "editor" });
    const invite = await issueToken(id, "invite");
    await setAccess(id, "disabled");
    expect(await peekToken(invite, ["invite"])).toBeNull();
  });
});

describe("roles and access", () => {
  it("always keeps at least one active owner", async () => {
    const drew = await activeStaff("drew@example.com", "owner");
    await expect(changeRole(drew, "editor")).rejects.toThrow(LastOwnerError);
    await expect(setAccess(drew, "disabled")).rejects.toThrow(LastOwnerError);

    const sam = await activeStaff("sam@example.com", "editor");
    await changeRole(sam, "owner");
    await changeRole(drew, "editor"); // fine now: Sam is an owner
    await expect(setAccess(sam, "disabled")).rejects.toThrow(LastOwnerError);
  });

  it("removing access signs someone out; restoring brings back their old status", async () => {
    await activeStaff("owner@example.com", "owner");
    const ada = await activeStaff("ada@example.com");
    const { token } = await createSession(ada);
    await setAccess(ada, "disabled");
    expect(
      await db().select().from(schema.staffSessions).where(eq(schema.staffSessions.userId, ada)),
    ).toHaveLength(0);
    await setAccess(ada, "restore");
    expect((await findStaffByEmail("ada@example.com"))?.status).toBe("active");
    expect(await getSessionStaff(token)).toBeNull(); // they sign in again

    const invited = await createStaff({ email: "new@example.com", name: "New", role: "editor" });
    await setAccess(invited, "disabled");
    await setAccess(invited, "restore");
    expect((await findStaffByEmail("new@example.com"))?.status).toBe("invited");
  });
});

describe("rate limits", () => {
  it("allow up to the limit in the window, then say how long to wait", async () => {
    for (let i = 0; i < 3; i++) expect((await rateLimit("t:ada", 3, 60)).ok).toBe(true);
    const blocked = await rateLimit("t:ada", 3, 60);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(50);
    expect((await rateLimit("t:other", 3, 60)).ok).toBe(true);
    await clearRateLimit("t:ada");
    expect((await rateLimit("t:ada", 3, 60)).ok).toBe(true);
  });
});
