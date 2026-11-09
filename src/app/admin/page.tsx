import { Suspense } from "react";
import { requireStaff } from "@/cms/auth";
import { countInquiries } from "@/cms/inquiries";
import { PageHeader, Skeleton, StatTile, controls as c } from "@/cms/ui";

export default function AdminHomePage() {
  return (
    <>
      <PageHeader pretitle="1880 Studio" title="What's happening on 1880.io" />
      <Suspense fallback={<Skeleton lines={2} />}>
        <Stats />
      </Suspense>
    </>
  );
}

async function Stats() {
  await requireStaff();
  const counts = await countInquiries();
  return (
    <div className={c.stats}>
      <StatTile label="New inquiries" value={counts.new} href="/admin/inquiries" />
      <StatTile
        label="Inquiries in the inbox"
        value={counts.new + counts.read}
        href="/admin/inquiries?view=all"
      />
      <StatTile label="Archived" value={counts.archived} href="/admin/inquiries?view=archived" />
    </div>
  );
}
