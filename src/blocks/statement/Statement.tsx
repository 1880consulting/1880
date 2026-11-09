import section from "@/site/section.module.css";
import { LitWords } from "./LitWords";
import type { StatementBlock } from "./schema";

export function Statement({ block }: { block: StatementBlock }) {
  return (
    <section className={`${section.section} ${section.chapter}`}>
      <div className={section.wrap}>
        <h2 className={section.huge}>
          <LitWords text={block.text} />
        </h2>
      </div>
    </section>
  );
}
