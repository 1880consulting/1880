"use server";

import { updateTag } from "next/cache";
import { audit } from "@/cms/audit";
import { requireStaff } from "@/cms/auth";
import type { SaveMenusResult } from "@/cms/menus/MenusEditor";
import { menusSchema } from "@/cms/menus/schema";
import { setSetting } from "@/cms/settings";
import { MENUS_TAG } from "@/site/menus";

/** Saves the menus and footer; every page shows them at once. */
export async function saveMenus(input: unknown): Promise<SaveMenusResult> {
  const me = await requireStaff();
  const parsed = menusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Some links need attention before saving.",
      issues: parsed.error.issues.map((i) => ({
        path: i.path as (string | number)[],
        message: i.message,
      })),
    };
  }
  await setSetting("site.menus", parsed.data);
  updateTag(MENUS_TAG);
  await audit({ actor: { type: "staff", id: me.id }, action: "menus.updated" });
  return { ok: true };
}
