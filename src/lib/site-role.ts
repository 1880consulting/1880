import { notFound } from "next/navigation";
import { parseSiteRole, roleServes, type Surface } from "./routing";

/**
 * Second line of defence behind `src/proxy.ts`: each route group's layout
 * calls this so a deployment never serves a surface its SITE_ROLE excludes.
 */
export function requireSurface(surface: Surface): void {
  if (!roleServes(parseSiteRole(process.env.SITE_ROLE), surface)) notFound();
}
