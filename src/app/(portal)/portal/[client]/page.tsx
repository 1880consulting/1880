import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireClientArea } from "@/lib/portal/auth";
import { KIND_LABELS, listClientDocuments, type DocKind } from "@/lib/portal/documents";
import { longDate } from "@/portal/DocumentBody";
import s from "@/portal/portal.module.css";

export async function generateMetadata({
  params,
}: PageProps<"/portal/[client]">): Promise<Metadata> {
  const { client: slug } = await params;
  const { client } = await requireClientArea(slug);
  return { title: client.name };
}

const FILTERS: { label: string; kind?: DocKind }[] = [
  { label: "All" },
  { label: "Reports", kind: "report" },
  { label: "Proposals", kind: "proposal" },
  { label: "Other", kind: "other" },
];

/** A client's home: their reports and proposals, newest first. */
export default function ClientHomePage({ params, searchParams }: PageProps<"/portal/[client]">) {
  return (
    <Suspense>
      <ClientHome params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ClientHome({
  params,
  searchParams,
}: Pick<PageProps<"/portal/[client]">, "params" | "searchParams">) {
  const { client: slug } = await params;
  const { user, client } = await requireClientArea(slug);
  const sp = await searchParams;
  const kind = FILTERS.find((f) => f.kind && f.kind === sp.type)?.kind;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const [docs, all] = await Promise.all([
    listClientDocuments(client.id, user.id, { kind, q }),
    kind || q ? listClientDocuments(client.id, user.id) : null,
  ]);
  const total = all ?? docs;
  const fresh = total.filter((d) => d.isNew).length;

  return (
    <>
      <p className={s.label}>{client.name}</p>
      <h1 className={s.title}>Welcome, {user.name.split(" ")[0]}</h1>
      <p className={s.lead}>
        {total.length === 0
          ? "Your reports and proposals from 1880, in one place."
          : fresh > 0
            ? `${fresh} new since your last visit.`
            : "Your reports and proposals from 1880, in one place."}
      </p>

      {total.length === 0 ? (
        <div className={s.empty}>
          <h2>Nothing here yet</h2>
          <p>When 1880 shares a report or proposal with you, it appears here and we email you.</p>
        </div>
      ) : (
        <>
          <div className={s.tools}>
            <nav aria-label="Filter documents">
              <ul className={s.filters}>
                {FILTERS.map((f) => (
                  <li key={f.label}>
                    <Link
                      href={f.kind ? `/${slug}?type=${f.kind}` : `/${slug}`}
                      aria-current={f.kind === kind ? "page" : undefined}
                    >
                      {f.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <form className={s.search} role="search" action={`/${slug}`}>
              {kind && <input type="hidden" name="type" value={kind} />}
              <label htmlFor="doc-search" className="visually-hidden">
                Search documents
              </label>
              <input
                id="doc-search"
                name="q"
                type="search"
                className={s.input}
                placeholder="Search"
                defaultValue={q}
              />
            </form>
          </div>
          {docs.length === 0 ? (
            <p className={s.small}>Nothing matches. Try another word or filter.</p>
          ) : (
            <ul className={s.list}>
              {docs.map((d) => (
                <li key={d.id}>
                  <Link href={`/${slug}/d/${d.id}`} className={s.docRow}>
                    <span className={s.docTitle}>
                      {d.title}
                      {d.isNew && <span className={s.new}>New</span>}
                    </span>
                    <span className={s.docMeta}>
                      {KIND_LABELS[d.kind]} · {longDate(d.publishedAt)}
                    </span>
                    {d.summary && <p className={s.docSummary}>{d.summary}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
