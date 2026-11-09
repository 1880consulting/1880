import section from "@/site/section.module.css";
import { Logo } from "@/site/ui/Logo";
import { Reveal } from "@/site/ui/Reveal";
import type { NamesakeBlock } from "./schema";
import styles from "./Namesake.module.css";

export function Namesake({ block }: { block: NamesakeBlock }) {
  return (
    <section className={`${section.section} ${section.sunken} ${section.chapter}`}>
      <div className={`${section.wrap} ${styles.inner}`}>
        <Reveal className={styles.year}>
          <span aria-hidden>
            <Logo label="" />
          </span>
        </Reveal>
        <div className={styles.row}>
          <Reveal as="h2" delay={1} className={`${section.big} ${styles.lead}`}>
            {block.lead}
          </Reveal>
          {(block.detail || block.close) && (
            <div className={styles.close}>
              {block.detail && (
                <Reveal as="p" delay={2} className={`${section.mid} ${section.muted}`}>
                  {block.detail}
                </Reveal>
              )}
              {block.close && (
                <Reveal as="p" delay={3} className={`${section.huge} ${styles.closeLine}`}>
                  {block.close}
                </Reveal>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
