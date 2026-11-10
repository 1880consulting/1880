import type { Metadata } from "next";
import { EntryPage, entryMetadata, staticParams } from "@/site/entries/detail";

// The first visit waits for the whole page, so missing ones get a real 404.
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return staticParams("service");
}

export async function generateMetadata({
  params,
}: PageProps<"/services/[slug]">): Promise<Metadata> {
  return entryMetadata("service", (await params).slug);
}

export default async function Page({ params }: PageProps<"/services/[slug]">) {
  return <EntryPage type="service" slug={(await params).slug} />;
}
