import { Suspense } from "react";
import { requireStaff } from "@/cms/auth";
import { getSetting } from "@/cms/settings";
import { PageHeader, Panel, Skeleton } from "@/cms/ui";
import { RecipientsForm } from "./RecipientsForm";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        pretitle="1880 Studio"
        title="Settings"
        description="Site-wide settings for 1880.io."
      />
      <Panel title="Inquiry alerts">
        <Suspense fallback={<Skeleton lines={3} />}>
          <Recipients />
        </Suspense>
      </Panel>
    </>
  );
}

async function Recipients() {
  await requireStaff();
  const recipients = await getSetting("inquiries.alertRecipients");
  return <RecipientsForm initial={recipients} />;
}
