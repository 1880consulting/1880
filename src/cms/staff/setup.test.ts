import { afterEach, describe, expect, it } from "vitest";
import { setupTestDatabase } from "@/test/db";
import { createStaff, setPassword } from "./service";
import { setupAvailable, setupTokenMatches } from "./setup";

setupTestDatabase();

const TOKEN = "a-long-random-setup-token-0123456789";

describe("first-owner setup", () => {
  afterEach(() => {
    delete process.env.STUDIO_SETUP_TOKEN;
  });

  it("is closed unless a long enough setup token is configured", async () => {
    expect(await setupAvailable()).toBe(false);
    process.env.STUDIO_SETUP_TOKEN = "short";
    expect(await setupAvailable()).toBe(false);
    expect(setupTokenMatches("short")).toBe(false);
    process.env.STUDIO_SETUP_TOKEN = TOKEN;
    expect(await setupAvailable()).toBe(true);
  });

  it("checks the token exactly", () => {
    process.env.STUDIO_SETUP_TOKEN = TOKEN;
    expect(setupTokenMatches(TOKEN)).toBe(true);
    expect(setupTokenMatches(TOKEN + "x")).toBe(false);
    expect(setupTokenMatches("")).toBe(false);
  });

  it("closes for good once an owner exists", async () => {
    process.env.STUDIO_SETUP_TOKEN = TOKEN;
    const id = await createStaff({ email: "drew@1880.test", name: "Drew", role: "owner" });
    expect(await setupAvailable()).toBe(true); // invited, not active yet
    await setPassword(id, "a long enough password");
    expect(await setupAvailable()).toBe(false);
  });
});
