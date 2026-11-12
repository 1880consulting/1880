import { describe, expect, it } from "vitest";
import { audit } from "@/cms/audit";
import { createEntry } from "@/cms/content/store";
import { createStaff } from "@/cms/staff/service";
import { createDocument } from "@/lib/portal/documents";
import { createTenant } from "@/lib/portal/manage";
import { pageType } from "@/site/cms";
import { setupTestDatabase } from "@/test/db";
import { listActivity, pendingDrafts } from "./activity";

setupTestDatabase();

describe("Studio activity", () => {
  it("writes records out as sentences with names, titles and links", async () => {
    const drew = await createStaff({ email: "drew@1880.test", name: "Drew", role: "owner" });
    const page = await createEntry(pageType, { title: "About us", slug: "about-us" }, drew);
    const acme = await createTenant({ name: "Acme", slug: "acme" });
    const doc = await createDocument({
      tenantId: acme,
      title: "Q3 report",
      kind: "report",
      format: "blocks",
      authorId: drew,
    });
    await audit({ actor: { type: "staff", id: drew }, action: "page.published", target: page });
    await audit({
      actor: { type: "staff", id: drew },
      action: "document.published",
      target: doc,
      tenantId: acme,
    });
    await audit({ actor: { type: "staff", id: drew }, action: "staff.sign_in" });
    await audit({ actor: { type: "system" }, action: "staff.sign_in_failed", target: "x@y.z" });

    const all = await listActivity();
    expect(all.map((a) => `${a.who} ${a.what}`)).toEqual([
      "Studio had a failed sign-in for x@y.z",
      "Drew signed in",
      "Drew published the document “Q3 report” for Acme",
      "Drew published the page “About us”",
    ]);
    expect(all[2].href).toBe(`/admin/clients/${acme}/documents/${doc}`);
    expect(all[3].href).toBe(`/admin/pages/${page}`);

    // The Overview shows content changes only; filters narrow by person.
    const content = await listActivity({ contentOnly: true });
    expect(content.map((a) => a.action)).toEqual(["document.published", "page.published"]);
    expect(await listActivity({ who: "system" })).toHaveLength(1);
    expect(await listActivity({ who: `staff:${drew}` })).toHaveLength(3);
  });

  it("lists drafts waiting to be published", async () => {
    await createEntry(pageType, { title: "New page", slug: "new-page" }, null);
    const waiting = await pendingDrafts();
    expect(waiting.map((w) => [w.title, w.live])).toEqual([["New page", false]]);
  });
});
