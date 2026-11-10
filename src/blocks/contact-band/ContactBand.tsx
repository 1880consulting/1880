import section from "@/site/section.module.css";
import { ButtonLink } from "@/site/ui/Button";
import { CopyEmail } from "@/site/ui/CopyEmail";
import { Reveal } from "@/site/ui/Reveal";
import type { ContactBandBlock } from "./schema";
import styles from "./ContactBand.module.css";

export function ContactBand({ block, email }: { block: ContactBandBlock; email: string }) {
  return (
    <section id={block.anchor} data-tone="ink" className={`${section.section} ${styles.band}`}>
      <div className={`${section.wrap} ${styles.inner}`}>
        <Reveal as="h2" className={styles.title}>
          {block.title}
        </Reveal>
        {block.body && (
          <Reveal as="p" delay={1} className={styles.body}>
            {block.body}
          </Reveal>
        )}
        {block.button && (
          <Reveal delay={2}>
            <ButtonLink href={block.button.href}>{block.button.label}</ButtonLink>
          </Reveal>
        )}
        {block.showEmail && (
          <Reveal delay={2}>
            <CopyEmail email={email} />
          </Reveal>
        )}
      </div>
    </section>
  );
}
