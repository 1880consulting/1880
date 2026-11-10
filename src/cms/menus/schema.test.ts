import { describe, expect, it } from "vitest";
import { BUILT_IN_MENUS } from "@/site/menus";
import { isExternal, isSafeHref, menusSchema } from "./schema";

describe("menu links", () => {
  it("accept pages, sections, web addresses and email", () => {
    for (const ok of [
      "/",
      "/contact",
      "/#what-we-do",
      "https://www.linkedin.com/company/1880-consulting",
      "http://example.com/a?b=c",
      "mailto:inquiries@1880consulting.com",
    ]) {
      expect(isSafeHref(ok), ok).toBe(true);
    }
  });

  it("refuse anything that could run code or leave the site unexpectedly", () => {
    for (const bad of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html,<b>x</b>",
      "//evil.example",
      "/\\evil.example",
      "vbscript:x",
      "contact",
      "https://localhost",
      "mailto:not-an-email",
      "ftp://example.com/file",
    ]) {
      expect(isSafeHref(bad), bad).toBe(false);
    }
  });

  it("know which links leave the site", () => {
    expect(isExternal("https://instagram.com/1880consulting")).toBe(true);
    expect(isExternal("/contact")).toBe(false);
  });
});

describe("menus", () => {
  it("accept the site's built-in menus", () => {
    expect(menusSchema.safeParse(BUILT_IN_MENUS).success).toBe(true);
  });

  it("explain what to fix, with where", () => {
    const r = menusSchema.safeParse({
      main: [
        { label: "", href: "/a" },
        { label: "Bad", href: "javascript:alert(1)" },
      ],
      button: null,
      footer: Array.from({ length: 9 }, () => ({ label: "x", href: "/x" })),
      showEmail: true,
    });
    expect(r.success).toBe(false);
    const issues = r.error!.issues.map((i) => [i.path.join("."), i.message]);
    expect(issues).toEqual(
      expect.arrayContaining([
        ["main.0.label", "Give the link a label."],
        ["main.1.href", expect.stringContaining("Use a page like /contact")],
        ["footer", "Keep the footer to 8 links or fewer."],
      ]),
    );
  });

  it("trim labels and addresses", () => {
    const r = menusSchema.parse({
      main: [{ label: "  About  ", href: " /about " }],
      button: null,
      footer: [],
      showEmail: false,
    });
    expect(r.main[0]).toEqual({ label: "About", href: "/about" });
  });
});
