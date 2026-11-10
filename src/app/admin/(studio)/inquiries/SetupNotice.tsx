import Link from "next/link";
import { getSetting } from "@/cms/settings";
import { Alert } from "@/cms/ui";

/** Tells the team when new inquiries won't reach anyone's inbox. */
export async function SetupNotice() {
  const recipients = await getSetting("inquiries.alertRecipients");
  if (recipients.length === 0) {
    return (
      <Alert tone="warning" title="No one gets an email about new inquiries yet">
        Messages are saved here either way.{" "}
        <Link href="/admin/settings">Add alert recipients in Settings</Link>.
      </Alert>
    );
  }
  if (!process.env.RESEND_API_KEY) {
    return (
      <Alert tone="info" title="Email alerts are off on this computer">
        RESEND_API_KEY isn&apos;t set, so alerts are saved as &ldquo;Not emailed&rdquo;. Messages
        still arrive here.
      </Alert>
    );
  }
  return null;
}
