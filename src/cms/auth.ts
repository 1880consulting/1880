import "server-only";
import { notFound } from "next/navigation";

export interface Staff {
  name: string;
  role: "owner" | "editor";
}

/**
 * Who is using 1880 Studio. Staff sign-in isn't built yet (PLAN Phase 0), so
 * for now Studio only works in local development (`npm run dev`). Anywhere
 * else this ends the request with Not found, and `src/proxy.ts` already
 * answers 404 for /admin in production.
 *
 * Call it at the top of every Studio page section and server action that
 * reads or changes data. When sign-in lands, only this function changes.
 */
export async function requireStaff(): Promise<Staff> {
  if (process.env.NODE_ENV === "development") {
    return { name: "Local developer", role: "owner" };
  }
  notFound();
}
