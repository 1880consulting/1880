"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { audit } from "@/cms/audit";
import { linkOrigin, requireStaff } from "@/cms/auth";
import { sendMail } from "@/cms/mail";
import { inviteEmail } from "@/cms/staff/emails";
import {
  changeRole,
  createStaff,
  findStaffByEmail,
  getStaffById,
  issueToken,
  LastOwnerError,
  setAccess,
} from "@/cms/staff/service";

export interface InviteState {
  status: "idle" | "error" | "invited";
  message?: string;
  /** The invite link, shown once so an owner can share it if email isn't set up. */
  link?: string;
  emailed?: boolean;
  name?: string;
  values?: { name: string; email: string; role: string };
}

const role = z.enum(["owner", "editor"]);
const id = z.uuid();

async function sendInvite(userId: string, invitedBy: string) {
  const user = (await getStaffById(userId))!;
  const token = await issueToken(userId, "invite");
  const link = `${await linkOrigin()}/admin/set-password?token=${token}`;
  const result = await sendMail({ to: [user.email], ...inviteEmail(user.name, invitedBy, link) });
  return { link, emailed: result.ok, name: user.name };
}

export async function invitePerson(_prev: InviteState, form: FormData): Promise<InviteState> {
  const owner = await requireStaff({ owner: true });
  const values = {
    name: String(form.get("name") ?? "").trim(),
    email: String(form.get("email") ?? "").trim(),
    role: String(form.get("role") ?? "editor"),
  };
  const parsed = z
    .object({ name: z.string().min(1).max(200), email: z.email().max(320), role })
    .safeParse(values);
  if (!parsed.success) {
    const field = parsed.error.issues[0].path[0];
    const message =
      field === "name"
        ? "Enter their name."
        : field === "email"
          ? "Enter a full email address, like name@1880consulting.com."
          : "Choose a role.";
    return { status: "error", message, values };
  }
  if (await findStaffByEmail(parsed.data.email)) {
    return {
      status: "error",
      message: "That person already has access. Find them in the list below.",
      values,
    };
  }

  const userId = await createStaff(parsed.data);
  const sent = await sendInvite(userId, owner.name);
  await audit({
    actor: { type: "staff", id: owner.id },
    action: "staff.invited",
    target: parsed.data.email.toLowerCase(),
    detail: { role: parsed.data.role },
  });
  refresh();
  return { status: "invited", ...sent };
}

export async function resendInvite(_prev: InviteState, form: FormData): Promise<InviteState> {
  const owner = await requireStaff({ owner: true });
  const userId = id.parse(form.get("userId"));
  const user = await getStaffById(userId);
  if (!user || user.status !== "invited")
    return { status: "error", message: "They've already joined." };
  const sent = await sendInvite(userId, owner.name);
  await audit({
    actor: { type: "staff", id: owner.id },
    action: "staff.invite_resent",
    target: user.email,
  });
  return { status: "invited", ...sent };
}

export interface RowState {
  status: "idle" | "error" | "done";
  message?: string;
}

export async function updateRole(
  userId: string,
  _prev: RowState,
  form: FormData,
): Promise<RowState> {
  const owner = await requireStaff({ owner: true });
  const next = role.parse(form.get("role"));
  try {
    await changeRole(id.parse(userId), next);
  } catch (err) {
    if (err instanceof LastOwnerError) return { status: "error", message: err.message };
    throw err;
  }
  await audit({
    actor: { type: "staff", id: owner.id },
    action: "staff.role_changed",
    target: userId,
    detail: { role: next },
  });
  refresh();
  return { status: "done" };
}

export async function updateAccess(
  userId: string,
  access: "disabled" | "restore",
  _prev: RowState,
): Promise<RowState> {
  const owner = await requireStaff({ owner: true });
  const target = id.parse(userId);
  try {
    await setAccess(target, z.enum(["disabled", "restore"]).parse(access));
  } catch (err) {
    if (err instanceof LastOwnerError) return { status: "error", message: err.message };
    throw err;
  }
  await audit({
    actor: { type: "staff", id: owner.id },
    action: access === "disabled" ? "staff.access_removed" : "staff.access_restored",
    target,
  });
  refresh();
  return { status: "done" };
}
