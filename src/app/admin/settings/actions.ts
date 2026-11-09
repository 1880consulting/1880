"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/cms/auth";
import { setSetting } from "@/cms/settings";

export interface RecipientsState {
  status: "idle" | "saved" | "invalid";
  error?: string;
  value?: string;
}

/** One address per line (commas work too). Up to 20. */
export async function saveRecipients(
  _prev: RecipientsState,
  form: FormData,
): Promise<RecipientsState> {
  const staff = await requireStaff();
  if (staff.role !== "owner") return { status: "invalid", error: "Only owners can change this." };

  const value = String(form.get("recipients") ?? "");
  const list = [
    ...new Set(
      value
        .split(/[\s,;]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  const bad = list.find((e) => !z.email().safeParse(e).success);
  if (bad)
    return {
      status: "invalid",
      value,
      error: `"${bad}" isn't a full email address, like name@1880consulting.com.`,
    };
  if (list.length > 20) return { status: "invalid", value, error: "Use 20 addresses or fewer." };

  await setSetting("inquiries.alertRecipients", list);
  refresh();
  return { status: "saved", value: list.join("\n") };
}
