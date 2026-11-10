"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/cms/audit";
import { clientIp, currentStaff, endSession, linkOrigin, safeNext, startSession } from "@/cms/auth";
import { sendMail } from "@/cms/mail";
import { clearRateLimit, rateLimit } from "@/cms/rate-limit";
import { loginLinkEmail, resetEmail } from "@/cms/staff/emails";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/cms/staff/password";
import {
  checkPassword,
  consumeToken,
  deleteUserSessions,
  findStaffByEmail,
  issueToken,
  normalizeEmail,
  setPassword,
} from "@/cms/staff/service";

export interface FormState {
  status: "idle" | "error" | "sent";
  message?: string;
  email?: string;
}

const email = z.email().max(320);
const FIFTEEN_MIN = 15 * 60;

const tooMany = (seconds: number): FormState => ({
  status: "error",
  message: `Too many tries. Wait ${Math.ceil(seconds / 60)} minute${seconds > 60 ? "s" : ""} and try again.`,
});

// ---- Email + password ----

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const raw = {
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  };
  const parsed = z.object({ email, password: z.string().min(1).max(PASSWORD_MAX) }).safeParse(raw);
  if (!parsed.success)
    return { status: "error", message: "Enter your email and password.", email: raw.email };

  const addr = normalizeEmail(parsed.data.email);
  const ip = await clientIp();
  for (const [key, limit] of [
    [`login:ip:${ip}`, 20],
    [`login:email:${addr}`, 8],
  ] as const) {
    const rl = await rateLimit(key, limit, FIFTEEN_MIN);
    if (!rl.ok) return { ...tooMany(rl.retryAfterSeconds), email: raw.email };
  }

  const staff = await checkPassword(addr, parsed.data.password);
  if (!staff) {
    await audit({
      actor: { type: "system" },
      action: "staff.sign_in_failed",
      target: addr,
      detail: { ip },
    });
    return {
      status: "error",
      message: "That email and password don't match. Try again or use an email link.",
      email: raw.email,
    };
  }

  await clearRateLimit(`login:email:${addr}`);
  await startSession(staff.id);
  await audit({
    actor: { type: "staff", id: staff.id },
    action: "staff.sign_in",
    detail: { method: "password", ip },
  });
  redirect(safeNext(form.get("next")));
}

// ---- Emailed links (sign-in and password reset) ----

/**
 * Emails a one-time link. The answer is the same whether or not the address
 * has an account, so nobody can use this to find out who works at 1880.
 */
async function emailLink(form: FormData, purpose: "login" | "reset"): Promise<FormState> {
  const raw = String(form.get("email") ?? "");
  const parsed = email.safeParse(raw.trim());
  if (!parsed.success)
    return { status: "error", message: "Enter your full work email address.", email: raw };
  if (!process.env.RESEND_API_KEY && process.env.NODE_ENV === "production") {
    return {
      status: "error",
      message: "Email links aren't switched on yet. Sign in with your password.",
      email: raw,
    };
  }

  const addr = normalizeEmail(parsed.data);
  const ip = await clientIp();
  for (const [key, limit] of [
    [`link:ip:${ip}`, 10],
    [`link:email:${addr}`, 3],
  ] as const) {
    const rl = await rateLimit(key, limit, FIFTEEN_MIN);
    if (!rl.ok) return { ...tooMany(rl.retryAfterSeconds), email: raw };
  }

  const user = await findStaffByEmail(addr);
  if (user?.status === "active") {
    const token = await issueToken(user.id, purpose);
    const path = purpose === "login" ? "/admin/link" : "/admin/set-password";
    const link = `${await linkOrigin()}${path}?token=${token}`;
    const mail =
      purpose === "login" ? loginLinkEmail(user.name, link) : resetEmail(user.name, link);
    const result = await sendMail({ to: [user.email], ...mail });
    if (!result.ok) {
      // On a developer's computer there's no email: print the link instead.
      if (process.env.NODE_ENV === "development")
        console.info(`\n[studio] ${mail.subject} for ${user.email}:\n${link}\n`);
      else console.error("[studio] could not email link", result.error);
    }
    await audit({
      actor: { type: "staff", id: user.id },
      action: `staff.${purpose}_link_sent`,
      detail: { ip },
    });
  }
  return { status: "sent", email: raw };
}

export async function requestSignInLink(_prev: FormState, form: FormData): Promise<FormState> {
  return emailLink(form, "login");
}

export async function requestPasswordReset(_prev: FormState, form: FormData): Promise<FormState> {
  return emailLink(form, "reset");
}

/** The "Continue" button on the page a sign-in link opens. */
export async function confirmSignInLink(token: string): Promise<void> {
  const found = typeof token === "string" ? await consumeToken(token, ["login"]) : null;
  if (!found || found.user.status !== "active") redirect("/admin/link?expired=1");
  await startSession(found.user.id);
  await audit({
    actor: { type: "staff", id: found.user.id },
    action: "staff.sign_in",
    detail: { method: "link" },
  });
  redirect("/admin");
}

// ---- Setting a password (invite or reset link) ----

export async function choosePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (password.length < PASSWORD_MIN) {
    return {
      status: "error",
      message: `Use at least ${PASSWORD_MIN} characters. A short sentence works well.`,
    };
  }
  if (password.length > PASSWORD_MAX)
    return { status: "error", message: `Use ${PASSWORD_MAX} characters or fewer.` };
  if (password !== String(form.get("confirm") ?? "")) {
    return { status: "error", message: "The two passwords don't match. Type them again." };
  }

  const found = await consumeToken(token, ["invite", "reset"]);
  if (!found) {
    return {
      status: "error",
      message: "This link has expired or was already used. Ask for a new one.",
    };
  }
  await setPassword(found.user.id, password);
  // A reset signs out every other browser, in case someone else had access.
  await deleteUserSessions(found.user.id);
  await startSession(found.user.id);
  await audit({
    actor: { type: "staff", id: found.user.id },
    action: found.purpose === "invite" ? "staff.invite_accepted" : "staff.password_reset",
  });
  redirect("/admin");
}

// ---- Signing out ----

export async function signOut(): Promise<void> {
  const staff = await currentStaff();
  await endSession();
  if (staff) await audit({ actor: { type: "staff", id: staff.id }, action: "staff.sign_out" });
  redirect("/admin/login");
}
