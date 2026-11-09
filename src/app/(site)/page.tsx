import type { Metadata } from "next";
import { RenderBlocks } from "@/blocks";
import { home, site } from "@/site/content";

export const metadata: Metadata = {
  title: { absolute: home.title },
  description: home.description,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <RenderBlocks blocks={home.blocks} context={{ email: site.email }} />;
}
