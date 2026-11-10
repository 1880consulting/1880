import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";
import { getMediaForDocument } from "@/lib/portal/branding";
import { requireClientArea } from "@/lib/portal/auth";
import { getClientDocument, KIND_LABELS, recordDocumentEvent } from "@/lib/portal/documents";
import { formatBytes } from "@/cms/media/types";
import { DocumentBody, longDate } from "@/portal/DocumentBody";
import { PrintButton } from "@/portal/PrintButton";
import s from "@/portal/portal.module.css";

export async function generateMetadata({
  params,
}: PageProps<"/portal/[client]/d/[id]">): Promise<Metadata> {
  const { client: slug, id } = await params;
  const { client } = await requireClientArea(slug);
  const doc = await getClientDocument(client.id, id);
  return { title: doc ? `${doc.doc.title} · ${client.name}` : "Not found" };
}

/** One document, in its format: built in Studio, an interactive page, or a file. */
export default function DocumentPage({ params }: PageProps<"/portal/[client]/d/[id]">) {
  return (
    <Suspense>
      <Document params={params} />
    </Suspense>
  );
}

async function Document({ params }: Pick<PageProps<"/portal/[client]/d/[id]">, "params">) {
  const { client: slug, id } = await params;
  const { user, client } = await requireClientArea(slug);
  const found = await getClientDocument(client.id, id);
  if (!found) notFound();
  after(() =>
    recordDocumentEvent({
      tenantId: client.id,
      documentId: id,
      clientUserId: user.id,
      kind: "view",
    }),
  );
  const base = `/${slug}/d/${id}`;
  const kindLabel = KIND_LABELS[found.kind];
  const date = longDate(found.publishedAt);

  if (found.format === "interactive") {
    return (
      <div
        className={s.full}
        style={
          client.accentColor
            ? ({ "--client-accent": client.accentColor } as React.CSSProperties)
            : undefined
        }
      >
        <div className={s.slimBar}>
          <Link href={`/${slug}`} className={s.link}>
            ← Documents
          </Link>
          <h1 className={s.slimTitle} style={{ margin: 0, fontSize: 16, fontWeight: 400 }}>
            {found.doc.title}
          </h1>
          <Link href="/account" className={s.link}>
            Account
          </Link>
        </div>
        {/* No allow-same-origin: the page can't reach the portal or its session (PLAN §3.5). */}
        <iframe
          className={s.interactive}
          src={`${base}/page`}
          title={found.doc.title}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    );
  }

  if (found.format === "file") {
    const file = found.doc.file ? found.files[found.doc.file] : undefined;
    const summary =
      typeof found.doc.fields?.summary === "string" ? found.doc.fields.summary : undefined;
    return (
      <>
        <Link href={`/${slug}`} className={s.back}>
          ← All documents
        </Link>
        <p className={s.label}>
          {kindLabel} · {date}
        </p>
        <h1 className={s.title}>{found.doc.title}</h1>
        {summary && <p className={s.lead}>{summary}</p>}
        {file && (
          <>
            <div className={s.docActions}>
              <a className={s.link} href={`${base}/files/${file.id}?download=1`} download>
                Download {file.filename} ({formatBytes(file.bytes)})
              </a>
            </div>
            {file.mime === "application/pdf" && (
              <iframe className={s.pdf} src={`${base}/files/${file.id}`} title={file.filename} />
            )}
            {file.mime.startsWith("image/") && (
              // eslint-disable-next-line @next/next/no-img-element -- the client's own file
              <img className={s.fileImage} src={`${base}/files/${file.id}`} alt={found.doc.title} />
            )}
          </>
        )}
      </>
    );
  }

  const media = await getMediaForDocument(found.doc);
  return (
    <>
      <Link href={`/${slug}`} className={s.back}>
        ← All documents
      </Link>
      <DocumentBody
        kindLabel={kindLabel}
        date={date}
        doc={found.doc}
        context={{
          media,
          files: found.files,
          fileHref: (fileId) => `${base}/files/${fileId}`,
        }}
      />
      <div className={s.docActions}>
        <PrintButton />
      </div>
    </>
  );
}
