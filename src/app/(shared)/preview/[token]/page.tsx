import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { resolvePreviewToken } from "@/cms/content/preview-links";
import { longDate } from "@/cms/format";
import { PreviewBlocks } from "@/site/PreviewBlocks";
import { loadEntryPreview } from "@/site/preview-data";
import s from "@/site/PreviewBanner.module.css";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

/**
 * 1880.io/preview/<token>: an unpublished draft, for someone without a Studio
 * account (PLAN D50). proxy.ts has already answered 404 for a token that
 * doesn't work; this checks again.
 */
export default function SharedPreviewPage({ params }: PageProps<"/preview/[token]">) {
  return (
    <Suspense>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: Pick<PageProps<"/preview/[token]">, "params">) {
  await connection();
  const { token } = await params;
  const link = await resolvePreviewToken(token);
  const preview = link ? await loadEntryPreview(link.entryId) : null;
  if (!link || !preview) notFound();
  return (
    <>
      <PreviewBlocks {...preview.props} />
      <p className={s.banner} role="note">
        <strong>Preview.</strong>{" "}
        {preview.live
          ? "This shows changes to a live page that aren't published yet."
          : "This page isn't published yet."}{" "}
        Shared by 1880; the link works until {longDate(link.expiresAt)}.
      </p>
    </>
  );
}
