import { EmptyState, PageHeader } from "@/cms/ui";
import { SECTIONS, type SectionId } from "./sections";

/** Placeholder for a Studio section until it's built (PLAN Phase 2). */
export function SectionPlaceholder({ id }: { id: SectionId }) {
  const s = SECTIONS[id];
  return (
    <>
      <PageHeader pretitle="1880 Studio" title={s.label} />
      <EmptyState icon={s.icon} title="Not built yet" text={s.empty} />
    </>
  );
}

export function sectionMetadata(id: SectionId) {
  return { title: SECTIONS[id].label };
}
