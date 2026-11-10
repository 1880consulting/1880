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

describe("menus setting", () => {
  it("is empty until first saved, then keeps what was saved", async () => {
    expect(await getSetting("site.menus")).toBeNull();
    const menus = {
      main: [{ label: "About", href: "/about" }],
      button: null,
      footer: [],
      showEmail: false,
    };
    await setSetting("site.menus", menus);
    expect(await getSetting("site.menus")).toEqual(menus);
  });

  it("refuses unsafe links even if they get past the editor", async () => {
    await expect(
      setSetting("site.menus", {
        main: [{ label: "x", href: "javascript:alert(1)" }],
        button: null,
        footer: [],
        showEmail: false,
      }),
    ).rejects.toThrow();
  });
});
