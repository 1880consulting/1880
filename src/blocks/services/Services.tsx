import section from "@/site/section.module.css";
import { ButtonLink } from "@/site/ui/Button";
import { Reveal } from "@/site/ui/Reveal";
import type { ServicesBlock } from "./schema";
import styles from "./Services.module.css";

export function Services({ block }: { block: ServicesBlock }) {
  return (
    <section id={block.anchor} className={`${section.section} ${section.chapter}`}>
      <div className={`${section.wrap} ${styles.inner}`}>
        <Reveal className={styles.head}>
          {block.eyebrow && <p className={section.eyebrow}>{block.eyebrow}</p>}
          <h2 className={styles.title}>{block.title}</h2>
        </Reveal>
        <Reveal as="ul" className={styles.list}>
          {block.items.map((item) => (
            <li key={item} className={styles.item}>
              {item}
            </li>
          ))}
        </Reveal>
        {block.button && (
          <ButtonLink href={block.button.href} variant="ghost" className={styles.button}>
            {block.button.label}
          </ButtonLink>
        )}
      </div>
    </section>
  );
}
