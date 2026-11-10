import type { Metadata } from "next";
import { Suspense } from "react";
import { requireClientArea } from "@/lib/portal/auth";
import s from "@/portal/portal.module.css";

export async function generateMetadata({
  params,
}: PageProps<"/portal/[client]">): Promise<Metadata> {
  const { client: slug } = await params;
  const { client } = await requireClientArea(slug);
  return { title: client.name };
}

/** A client's home: welcome, then their documents (reports and proposals arrive in Phase 4). */
export default function ClientHomePage({ params }: PageProps<"/portal/[client]">) {
  return (
    <Suspense>
      <ClientHome params={params} />
    </Suspense>
  );
}

async function ClientHome({ params }: Pick<PageProps<"/portal/[client]">, "params">) {
  const { client: slug } = await params;
  const { user, client } = await requireClientArea(slug);
  return (
    <>
      <p className={s.label}>{client.name}</p>
      <h1 className={s.title}>Welcome, {user.name.split(" ")[0]}</h1>
      <p className={s.lead}>Your reports and proposals from 1880, in one place.</p>
      <div className={s.empty}>
        <h2>Nothing here yet</h2>
        <p>When 1880 shares a report or proposal with you, it appears here and we email you.</p>
      </div>
    </>
  );
}
