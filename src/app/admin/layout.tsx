import type { Metadata } from "next";
import { requireSurface } from "@/lib/site-role";

export const metadata: Metadata = {
  title: { default: "Studio", template: "%s · 1880 Studio" },
  robots: { index: false, follow: false },
};

/** 1880 Studio (the CMS) at 1880.io/admin: sign-in pages in (auth), the rest in (studio). */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  requireSurface("public");
  return children;
}
