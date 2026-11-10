"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/cms/audit";
import { requireStaff } from "@/cms/auth";
import { sendMail } from "@/cms/mail";
import { clientInviteEmail } from "@/lib/portal/emails";
import {
  addPerson,
  ClientNameError,
  createTenant,
  getTenant,
  isMember,
  removePerson,
  setTenantStatus,
  updateTenant,
} from "@/lib/portal/manage";
import { portalOrigin } from "@/lib/portal/origin";
import { getClientUser, issueClientToken } from "@/lib/portal/users";

/** 1880 Studio: clients and the people who can see them (PLAN §3.4). Any staff member. */

const id = z.uuid();

export interface ClientFormState {
  status: "idle" | "error" | "saved";
  message?: string;
  field?: "name" | "slug" | "accentColor";
}

const clientInput = z.object({
  name: z.string().trim().min(1, "Enter the client's name.").max(200),
  slug: z.string().trim().toLowerCase().min(1, "Choose a URL name.").max(63),
  accentColor: z
    .string()
    .regex(/^(#[0-9a-fA-F]{6})?$/, "Use a hex color like #1f6feb, or leave it blank.")
    .optional(),
  logoMediaId: z.union([z.uuid(), z.literal("")]).optional(),
});

function readClient(form: FormData) {
  return clientInput.safeParse({
    name: String(form.get("name") ?? ""),
    slug: String(form.get("slug") ?? ""),
    accentColor: form.get("useAccent") ? String(form.get("accentColor") ?? "") : "",
    logoMediaId: String(form.get("logoMediaId") ?? ""),
  });
}

function formError(err: z.ZodError): ClientFormState {
  const issue = err.issues[0];
  return {
    status: "error",
    message: issue.message,
    field: issue.path[0] as ClientFormState["field"],
  };
}

export async function createClient(
  _prev: ClientFormState,
  form: FormData,
): Promise<ClientFormState> {
  const staff = await requireStaff();
  const parsed = readClient(form);
  if (!parsed.success) return formError(parsed.error);
  let tenantId: string;
  try {
    tenantId = await createTenant(parsed.data);
  } catch (err) {
    if (err instanceof ClientNameError)
      return { status: "error", message: err.message, field: "slug" };
    throw err;
  }
  await audit({
    actor: { type: "staff", id: staff.id },
    action: "client.created",
    target: parsed.data.slug,
    tenantId,
  });
  redirect(`/admin/clients/${tenantId}`);
}

export async function saveClient(
  tenantId: string,
  _prev: ClientFormState,
  form: FormData,
): Promise<ClientFormState> {
  const staff = await requireStaff();
  const tid = id.parse(tenantId);
  const before = await getTenant(tid);
  if (!before) return { status: "error", message: "That client no longer exists." };
  const parsed = readClient(form);
  if (!parsed.success) return formError(parsed.error);
  try {
    await updateTenant(tid, parsed.data);
  } catch (err) {
    if (err instanceof ClientNameError)
      return { status: "error", message: err.message, field: "slug" };
    throw err;
  }
  await audit({
    actor: { type: "staff", id: staff.id },
    action: "client.updated",
    target: parsed.data.slug,
    tenantId: tid,
    detail: before.slug !== parsed.data.slug ? { from: before.slug } : undefined,
  });
  refresh();
  return { status: "saved" };
}

export async function changeClientStatus(tenantId: string, status: "active" | "archived") {
  const staff = await requireStaff();
  const tid = id.parse(tenantId);
  await setTenantStatus(tid, z.enum(["active", "archived"]).parse(status));
  await audit({
    actor: { type: "staff", id: staff.id },
    action: status === "archived" ? "client.archived" : "client.restored",
    tenantId: tid,
  });
  refresh();
}

// ---- People ----

export interface InviteState {
  status: "idle" | "error" | "invited";
  message?: string;
  /** The invite link, shown once so it can be shared if email isn't set up. */
  link?: string;
  emailed?: boolean;
  name?: string;
  values?: { name: string; email: string };
}

async function sendInvite(tenantId: string, userId: string, invitedBy: string) {
  const user = (await getClientUser(userId))!;
  const tenant = (await getTenant(tenantId))!;
  const token = await issueClientToken(userId, "invite");
  const link = `${await portalOrigin()}/auth?token=${token}&next=${encodeURIComponent(`/${tenant.slug}`)}`;
  const result = await sendMail({
    to: [user.email],
    ...clientInviteEmail(user.name, tenant.name, invitedBy, link),
  });
  return { link, emailed: result.ok, name: user.name };
}

export async function inviteClientPerson(
  tenantId: string,
  _prev: InviteState,
  form: FormData,
): Promise<InviteState> {
  const staff = await requireStaff();
  const tid = id.parse(tenantId);
  const values = {
    name: String(form.get("name") ?? "").trim(),
    email: String(form.get("email") ?? "").trim(),
  };
  const parsed = z
    .object({ name: z.string().min(1).max(200), email: z.email().max(320) })
    .safeParse(values);
  if (!parsed.success) {
    const field = parsed.error.issues[0].path[0];
    return {
      status: "error",
      message: field === "name" ? "Enter their name." : "Enter a full email address.",
      values,
    };
  }
  const tenant = await getTenant(tid);
  if (!tenant) return { status: "error", message: "That client no longer exists.", values };
  if (tenant.status !== "active")
    return { status: "error", message: "Restore this client before inviting people.", values };

  const { userId, already } = await addPerson(tid, parsed.data, staff.id);
  if (already)
    return {
      status: "error",
      message: "They already have access. Use “Resend invite” in the list if they need a link.",
      values,
    };
  const sent = await sendInvite(tid, userId, staff.name);
  await audit({
    actor: { type: "staff", id: staff.id },
    action: "client.person_invited",
    target: parsed.data.email.toLowerCase(),
    tenantId: tid,
  });
  refresh();
  return { status: "invited", ...sent };
}

export async function resendClientInvite(tenantId: string, userId: string): Promise<InviteState> {
  const staff = await requireStaff();
  const tid = id.parse(tenantId);
  const uid = id.parse(userId);
  if (!(await isMember(tid, uid)))
    return { status: "error", message: "They no longer have access." };
  const sent = await sendInvite(tid, uid, staff.name);
  await audit({
    actor: { type: "staff", id: staff.id },
    action: "client.invite_resent",
    target: uid,
    tenantId: tid,
  });
  return { status: "invited", ...sent };
}

export async function removeClientPerson(tenantId: string, userId: string): Promise<void> {
  const staff = await requireStaff();
  const tid = id.parse(tenantId);
  const uid = id.parse(userId);
  await removePerson(tid, uid);
  await audit({
    actor: { type: "staff", id: staff.id },
    action: "client.person_removed",
    target: uid,
    tenantId: tid,
  });
  refresh();
}
