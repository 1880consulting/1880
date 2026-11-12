import { Badge } from "@/cms/ui";
import type { InquiryRow } from "@/lib/db/schema";

const ALERT = {
  sent: { tone: "success", label: "Emailed" },
  pending: { tone: "info", label: "Sending" },
  failed: { tone: "danger", label: "Email failed" },
  skipped: { tone: "warning", label: "Not emailed" },
} as const;

export function AlertBadge({ status }: { status: InquiryRow["alertStatus"] }) {
  const a = ALERT[status];
  return <Badge tone={a.tone}>{a.label}</Badge>;
}

export function StatusBadge({ status }: { status: InquiryRow["status"] }) {
  if (status === "new") return <Badge tone="info">New</Badge>;
  if (status === "archived") return <Badge>Archived</Badge>;
  if (status === "spam") return <Badge tone="warning">Spam</Badge>;
  return <Badge>Read</Badge>;
}
