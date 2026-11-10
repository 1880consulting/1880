import { cacheTag } from "next/cache";
import type { Menus } from "@/cms/menus/schema";
import { getSetting } from "@/cms/settings";
import { site } from "./content";

/** On every page (the menus are in the layout): saving the menus refreshes them all. */
export const MENUS_TAG = "site:menus";

/** The menus as they were on 1880consulting.com: used until they're first saved in Studio. */
export const BUILT_IN_MENUS: Menus = {
  main: site.nav,
  button: site.cta,
  footer: site.social,
  showEmail: true,
};

export async function getMenus(): Promise<Menus> {
  "use cache";
  cacheTag(MENUS_TAG);
  try {
    return (await getSetting("site.menus")) ?? BUILT_IN_MENUS;
  } catch (err) {
    console.error(
      "[menus] could not read them, using the built-in ones:",
      err instanceof Error ? err.message : err,
    );
    return BUILT_IN_MENUS;
  }
}
