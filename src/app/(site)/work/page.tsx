import type { Metadata } from "next";
import { WorkFilter } from "@/site/entries/WorkFilter";
import s from "@/site/entries/entries.module.css";
import { getPublishedList } from "@/site/pages";
import section from "@/site/section.module.css";

export const metadata: Metadata = {
  title: "Case studies",
  description: "How 1880 helps growth-stage government contractors tell their stories and grow.",
  alternates: { canonical: "/work" },
};

/** Every published case study, newest first, filterable by service. */
export default async function WorkPage() {
  const [work, services] = await Promise.all([
    getPublishedList("work"),
    getPublishedList("service"),
  ]);
  return (
    <>
      <section data-tone="ink" className={`${section.section} ${s.header}`}>
        <div className={`${section.wrap} ${s.headerInner}`}>
          <p className={section.eyebrow}>{"// Our work"}</p>
          <h1 className={s.title}>Case studies</h1>
          <p className={s.summary}>
            How 1880 helps growth-stage government contractors tell their stories and grow.
          </p>
        </div>
      </section>
      <section className={`${section.section} ${s.band}`}>
        <div className={`${section.wrap} ${s.bandInner}`}>
          {work.entries.length === 0 ? (
            <p className={s.empty}>Case studies are on their way.</p>
          ) : (
            <WorkFilter
              work={work.entries}
              services={services.entries.map((sv) => ({ id: sv.id, title: sv.doc.title }))}
              media={work.media}
            />
          )}
        </div>
      </section>
    </>
  );
}
