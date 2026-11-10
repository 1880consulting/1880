import { Suspense } from "react";
import { requireStaff } from "@/cms/auth";
import { MediaLibrary } from "@/cms/media/MediaLibrary";
import { listMedia } from "@/cms/media/store";
import { PageHeader, Panel, Skeleton } from "@/cms/ui";

export const metadata = { title: "Media" };

export default function MediaPage() {
  return (
    <>
      <PageHeader
        pretitle="1880 Studio"
        title="Media"
        description="Upload images once and use them on any page. Each one is resized automatically for fast loading."
      />
      <Suspense
        fallback={
          <Panel>
            <Skeleton />
          </Panel>
        }
      >
        <Library />
      </Suspense>
    </>
  );
}

async function Library() {
  await requireStaff();
  return <MediaLibrary initial={await listMedia()} detailBase="/admin/media/" />;
}
