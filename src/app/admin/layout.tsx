import type { Metadata } from "next";
import { requireSurface } from "@/lib/site-role";

export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
};

/** 1880 Studio (the CMS): 1880.io/admin. Staff sign-in comes in Phase 0. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  requireSurface("public");
  return children;
}
