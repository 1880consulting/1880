import { notFound } from "next/navigation";
import { isValidClientName } from "@/lib/routing";

/**
 * Everything under clients.1880.io/<client>.
 *
 * `src/proxy.ts` already 404s reserved and malformed names before rendering;
 * this check is the backup. In Phase 3 the membership check ("unknown client"
 * and "not your client" both → the same Not found) must also run before any
 * streaming starts, so the response gets a real 404 status. See
 * node_modules/next/dist/docs/01-app/02-guides/streaming.md, "Status codes".
 */
// Blocking on purpose: the membership check must finish before anything is
// sent, so a client you can't see always gets a real 404, never a streamed shell.
export const instant = false;

export default async function ClientLayout({ children, params }: LayoutProps<"/portal/[client]">) {
  const { client } = await params;
  if (!isValidClientName(client)) notFound();
  return children;
}
