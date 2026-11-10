import { Suspense } from "react";
import { requireClientArea } from "@/lib/portal/auth";
import { clientLogo } from "@/lib/portal/branding";
import { PortalHeader } from "@/portal/PortalHeader";
import s from "@/portal/portal.module.css";

/**
 * Everything under clients.1880.io/<client>.
 *
 * `src/proxy.ts` has already checked, before rendering started, that the
 * visitor is signed in and belongs to this client (so "unknown" and "not
 * yours" get a real 404). requireClientArea() checks again here and in every
 * page: the second line of defense.
 */
export default function ClientLayout({ children, params }: LayoutProps<"/portal/[client]">) {
  return (
    <>
      <Suspense fallback={<PortalHeader signedIn />}>
        <BrandedHeader params={params} />
      </Suspense>
      <main id="main" className={s.main}>
        {children}
      </main>
    </>
  );
}

async function BrandedHeader({ params }: Pick<LayoutProps<"/portal/[client]">, "params">) {
  const { client: slug } = await params;
  const { client } = await requireClientArea(slug);
  return <PortalHeader signedIn client={client} logo={await clientLogo(client)} />;
}
