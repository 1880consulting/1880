import section from "@/site/section.module.css";
import { Reveal } from "@/site/ui/Reveal";
import type { FeatureBlock } from "./schema";
import styles from "./Feature.module.css";

export function Feature({ block }: { block: FeatureBlock }) {
  return (
    <section className={`${section.section} ${section.chapter}`}>
      <div className={`${section.wrap} ${styles.inner}`}>
        <Reveal as="h2" className={section.big}>
          {block.heading}
        </Reveal>
        {block.detail && (
          <Reveal as="p" delay={2} className={`${section.mid} ${section.muted} ${styles.detail}`}>
            {block.detail}
          </Reveal>
        )}
      </div>
    </section>
  );
}
