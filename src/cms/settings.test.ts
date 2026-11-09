import { describe, expect, it } from "vitest";
import { setupTestDatabase } from "@/test/db";
import { getSetting, setSetting } from "./settings";

setupTestDatabase();

describe("settings", () => {
  it("falls back to the default, then stores and updates a value", async () => {
    expect(await getSetting("inquiries.alertRecipients")).toEqual([]);
    await setSetting("inquiries.alertRecipients", ["a@example.com"]);
    await setSetting("inquiries.alertRecipients", ["a@example.com", "b@example.com"]);
    expect(await getSetting("inquiries.alertRecipients")).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
  });

  it("refuses values of the wrong shape", async () => {
    await expect(setSetting("inquiries.alertRecipients", ["not-an-email"])).rejects.toThrow();
  });
});
