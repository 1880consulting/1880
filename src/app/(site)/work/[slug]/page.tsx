import type { Metadata } from "next";
import { EntryPage, entryMetadata, staticParams } from "@/site/entries/detail";

// The first visit waits for the whole page, so missing ones get a real 404.
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return staticParams("work");
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  return entryMetadata("work", (await params).slug);
}

export default async function Page({ params }: PageProps<"/work/[slug]">) {
  return <EntryPage type="work" slug={(await params).slug} />;
}
