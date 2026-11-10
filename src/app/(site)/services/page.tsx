import type { Metadata } from "next";
import Link from "next/link";
import s from "@/site/entries/entries.module.css";
import { getPublishedList } from "@/site/pages";
import section from "@/site/section.module.css";

export const metadata: Metadata = {
  title: "Services",
  description: "Strategic marketing and communications for growth-stage government contractors.",
  alternates: { canonical: "/services" },
};

/** Every published service, in the order set in Studio. */
export default async function ServicesPage() {
  const { entries } = await getPublishedList("service");
  return (
    <>
      <section data-tone="ink" className={`${section.section} ${s.header}`}>
        <div className={`${section.wrap} ${s.headerInner}`}>
          <p className={section.eyebrow}>{"// What we do"}</p>
          <h1 className={s.title}>Services</h1>
          <p className={s.summary}>
            Strategic marketing and communications for growth-stage government contractors.
          </p>
        </div>
      </section>
      <section className={`${section.section} ${s.band}`}>
        <div className={section.wrap}>
          {entries.length === 0 ? (
            <p className={s.empty}>Service pages are on their way.</p>
          ) : (
            <ul className={s.serviceList}>
              {entries.map((e) => (
                <li key={e.id}>
                  <Link href={e.path} className={s.serviceRow}>
                    <span className={s.serviceName}>{e.doc.title}</span>
                    <span className={s.cardSummary}>
                      {(e.doc.fields as { summary?: string })?.summary}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
