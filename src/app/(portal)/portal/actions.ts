"use server";

import { z } from "zod";
import { audit } from "@/cms/audit";
import { clientIp } from "@/cms/auth";
import { sendMail } from "@/cms/mail";
import { rateLimit } from "@/cms/rate-limit";
import { clientAreasFor } from "@/lib/portal/access";
import {
  currentClientUser,
  endClientSession,
  safePortalNext,
  startClientSession,
} from "@/lib/portal/auth";
import { clientLoginEmail } from "@/lib/portal/emails";
import { portalOrigin } from "@/lib/portal/origin";
import {
  consumeClientToken,
  findClientUserByEmail,
  issueClientToken,
  normalizeEmail,
} from "@/lib/portal/users";

export interface LinkFormState {
  status: "idle" | "error" | "sent";
  message?: string;
  email?: string;
}

const FIFTEEN_MIN = 15 * 60;

/**
 * Emails a sign-in link. The answer is the same whether or not the address
 * has access, so nobody can use this to learn who 1880's clients are.
 */
export async function requestClientLink(
  _prev: LinkFormState,
  form: FormData,
): Promise<LinkFormState> {
  const raw = String(form.get("email") ?? "");
  const parsed = z.email().max(320).safeParse(raw.trim());
  if (!parsed.success)
    return { status: "error", message: "Enter your full email address.", email: raw };

  const addr = normalizeEmail(parsed.data);
  const ip = await clientIp();
  for (const [key, limit] of [
    [`portal-link:ip:${ip}`, 10],
    [`portal-link:email:${addr}`, 3],
  ] as const) {
    const rl = await rateLimit(key, limit, FIFTEEN_MIN);
    if (!rl.ok) {
      const minutes = Math.ceil(rl.retryAfterSeconds / 60);
      return {
        status: "error",
        message: `Too many tries. Wait ${minutes} minute${minutes > 1 ? "s" : ""} and try again.`,
        email: raw,
      };
    }
  }

  const user = await findClientUserByEmail(addr);
  if (user?.status === "active" && (await clientAreasFor(user.id)).length > 0) {
    const token = await issueClientToken(user.id, "login");
    const next = safePortalNext(form.get("next"));
    const link = `${await portalOrigin()}/auth?token=${token}${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`;
    const mail = clientLoginEmail(user.name, link);
    const result = await sendMail({ to: [user.email], ...mail });
    if (!result.ok) {
      // On a developer's computer there's no email: print the link instead.
      if (process.env.NODE_ENV === "development")
        console.info(`\n[portal] ${mail.subject} for ${user.email}:\n${link}\n`);
      else console.error("[portal] could not email link", result.error);
    }
    await audit({
      actor: { type: "client", id: user.id },
      action: "client.link_sent",
      detail: { ip, emailed: result.ok },
    });
  }
  return { status: "sent", email: raw };
}

/*
 * Portal actions answer with where to go next instead of calling redirect():
 * Next.js renders an action's redirect inside the same request, which skips
 * proxy.ts's rewrite to /portal and would show 1880.io's pages on the portal
 * host. The buttons (src/portal/ActionButton.tsx) then load that address.
 */

/** The "Continue" button on the page a sign-in link opens. Returns where to go. */
export async function confirmClientLink(token: string, next: string): Promise<string> {
  const user = typeof token === "string" ? await consumeClientToken(token) : null;
  if (!user) return "/auth?expired=1";
  await startClientSession(user.id);
  await audit({
    actor: { type: "client", id: user.id },
    action: "client.sign_in",
    detail: { ip: await clientIp() },
  });
  return safePortalNext(next);
}

export async function signOutClient(): Promise<string> {
  const user = await currentClientUser();
  await endClientSession();
  if (user) await audit({ actor: { type: "client", id: user.id }, action: "client.sign_out" });
  return "/";
}
