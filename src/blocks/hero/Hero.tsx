import { LOGO_DIGITS, LOGO_DOT, LOGO_VIEWBOX } from "@/site/logo-paths";
import section from "@/site/section.module.css";
import { ButtonLink } from "@/site/ui/Button";
import { Fragment } from "react";
import { splitWords } from "@/site/ui/words";
import type { HeroBlock } from "./schema";
import styles from "./Hero.module.css";

/** Words rise one by one: the full sentence stays readable to screen readers. */
function Rising({ text, start, step }: { text: string; start: number; step: number }) {
  const words = splitWords(text);
  return (
    <>
      <span className="visually-hidden">{text}</span>
      <span aria-hidden>
        {/* The space sits between the spans: an inline-block drops a trailing space. */}
        {words.map((w, i) => (
          <Fragment key={i}>
            {i > 0 && " "}
            <span className={styles.word} style={{ animationDelay: `${start + i * step}ms` }}>
              {w}
            </span>
          </Fragment>
        ))}
      </span>
    </>
  );
}

export function Hero({ block }: { block: HeroBlock }) {
  return (
    <section id="top" data-tone="ink" className={`${section.section} ${styles.hero}`}>
      <div className={styles.art} aria-hidden>
        <span className={styles.line} />
        <div className={styles.mark}>
          <svg viewBox={LOGO_VIEWBOX}>
            <g className={styles.digits}>
              {LOGO_DIGITS.map((d) => (
                <path key={d.slice(0, 24)} d={d} />
              ))}
            </g>
            <g className={styles.dot}>
              <path d={LOGO_DOT} />
            </g>
          </svg>
        </div>
      </div>
      <div className={`${section.wrap} ${styles.inner}`}>
        <h1 className={styles.title}>
          <Rising text={block.title} start={350} step={70} />
        </h1>
        {block.subtitle && (
          <p className={styles.sub}>
            <Rising text={block.subtitle} start={1000} step={28} />
          </p>
        )}
        {block.button && (
          <ButtonLink href={block.button.href} className={styles.cta}>
            {block.button.label}
          </ButtonLink>
        )}
      </div>
    </section>
  );
}
