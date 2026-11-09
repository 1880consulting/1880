import { IconLayoutDashboard } from "@tabler/icons-react";
import { EmptyState, PageHeader } from "@/cms/ui";

export default function AdminHomePage() {
  return (
    <>
      <PageHeader pretitle="1880 Studio" title="What's happening on 1880.io" />
      <EmptyState
        icon={<IconLayoutDashboard size={24} stroke={2} aria-hidden />}
        title="Nothing to show yet"
        text="Drafts waiting to publish, new inquiries and recent changes will appear here once the CMS is built."
      />
    </>
  );
}
