"use server";

import { audit } from "@/cms/audit";
import { currentSessionToken, requireStaff } from "@/cms/auth";
import { rateLimit } from "@/cms/rate-limit";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/cms/staff/password";
import { checkPassword, deleteUserSessions, setPassword } from "@/cms/staff/service";

export interface PasswordState {
  status: "idle" | "error" | "saved";
  message?: string;
}

export async function changePassword(_prev: PasswordState, form: FormData): Promise<PasswordState> {
  const me = await requireStaff();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");

  const rl = await rateLimit(`password:${me.id}`, 5, 15 * 60);
  if (!rl.ok)
    return { status: "error", message: "Too many tries. Wait a few minutes and try again." };
  if (!(await checkPassword(me.email, current))) {
    return { status: "error", message: "Your current password isn't right. Try again." };
  }
  if (next.length < PASSWORD_MIN) {
    return {
      status: "error",
      message: `Use at least ${PASSWORD_MIN} characters. A short sentence works well.`,
    };
  }
  if (next.length > PASSWORD_MAX)
    return { status: "error", message: `Use ${PASSWORD_MAX} characters or fewer.` };
  if (next !== String(form.get("confirm") ?? "")) {
    return { status: "error", message: "The two new passwords don't match. Type them again." };
  }

  await setPassword(me.id, next);
  // Keep this browser signed in; sign out everywhere else.
  await deleteUserSessions(me.id, await currentSessionToken());
  await audit({ actor: { type: "staff", id: me.id }, action: "staff.password_changed" });
  return { status: "saved", message: "Password changed. Other browsers are signed out." };
}
