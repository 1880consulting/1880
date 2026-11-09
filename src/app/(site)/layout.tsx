import { requireSurface } from "@/lib/site-role";

/** Public site: 1880.io */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  requireSurface("public");
  return children;
}
