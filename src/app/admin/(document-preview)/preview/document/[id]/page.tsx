import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireStaff } from "@/cms/auth";
import { mediaRefs } from "@/cms/media/refs";
import { getMediaMany } from "@/cms/media/store";
import { getDocument, KIND_LABELS, listDocumentFiles } from "@/lib/portal/documents";
import { documentType } from "@/portal/blocks/schema";
import { DocumentPreview } from "@/portal/DocumentPreview";

export const metadata = { title: "Preview" };

export default function PreviewPage({ params }: PageProps<"/admin/preview/document/[id]">) {
  return (
    <Suspense>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: Pick<PageProps<"/admin/preview/document/[id]">, "params">) {
  await requireStaff();
  const { id } = await params;
  const found = z.uuid().safeParse(id).success ? await getDocument(id) : null;
  if (!found || found.document.format !== "blocks") notFound();
  const [media, files] = await Promise.all([
    getMediaMany(mediaRefs(documentType, found.draft).map((r) => r.id)),
    listDocumentFiles(id),
  ]);
  return (
    <DocumentPreview
      documentId={id}
      kindLabel={KIND_LABELS[found.document.kind]}
      initial={found.draft}
      initialMedia={media}
      files={Object.fromEntries(files.map((f) => [f.id, f]))}
    />
  );
}
