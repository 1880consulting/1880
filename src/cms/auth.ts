import "server-only";
import { siteUrlSetting } from "@/lib/site-url";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { SESSION_COOKIE, STUDIO_PATH_HEADER } from "./staff/cookie";
import { createSession, deleteSession, getSessionStaff, type Staff } from "./staff/service";

export type { Staff } from "./staff/service";

/**
 * Who is signed in to 1880 Studio, read from the session cookie once per
 * request. `src/proxy.ts` already sends people without a cookie to the
 * sign-in page; this is the real check.
 */
export const currentStaff = cache(async (): Promise<Staff | null> => {
  // Studio data is private and always current: read it only for a real
  // request, never while Next.js prepares a page ahead of time (prefetching).
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getSessionStaff(token) : null;
});

/**
 * Call first in every Studio page section and server action that reads or
 * changes data. Not signed in → sign-in page. `owner: true` → owners only
 * (anyone else gets Not found).
 */
export async function requireStaff(opts: { owner?: boolean } = {}): Promise<Staff> {
  const staff = await currentStaff();
  if (!staff) {
    // The proxy passes the page that was asked for, so sign-in can return there.
    const path = (await headers()).get(STUDIO_PATH_HEADER);
    redirect(
      path && path !== "/admin" ? `/admin/login?next=${encodeURIComponent(path)}` : "/admin/login",
    );
  }
  if (opts.owner && staff.role !== "owner") notFound();
  return staff;
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  // No `domain`: host-only, so the cookie never reaches other subdomains.
} as const;

/** Signs this browser in as `userId` (server actions only). */
export async function startSession(userId: string): Promise<void> {
  const { token, expiresAt } = await createSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, { ...cookieOptions, expires: expiresAt });
}

/** Signs this browser out (server actions only). */
export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  // Clear it with the same attributes it was set with: browsers ignore a
  // deletion of a `__Host-` cookie that doesn't repeat Secure and Path.
  jar.set(SESSION_COOKIE, "", { ...cookieOptions, expires: new Date(0) });
}

/** The current browser's session token, e.g. to keep it when signing out everywhere else. */
export async function currentSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** The visitor's IP address, for rate limits. Hostinger's front end sets X-Forwarded-For. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Where links in emails point. Production uses SITE_URL (never the request's
 * Host header, which a visitor controls); development uses the address in use.
 */
export async function linkOrigin(): Promise<string> {
  const configured = siteUrlSetting();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return "https://1880.io";
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
}

/** Only allow redirects to Studio pages after sign-in (never to another site). */
export function safeNext(next: unknown): string {
  return typeof next === "string" && /^\/admin(\/[^/\\]|$|\?)/.test(next) && !next.includes("//")
    ? next
    : "/admin";
}
