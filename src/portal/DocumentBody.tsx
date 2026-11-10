import { PortalBlocks, type PortalBlockContext } from "./blocks/PortalBlocks";
import { visiblePortalBlocks } from "./blocks/schema";
import d from "./document.module.css";

/** A CMS-built document: kind and date, title, summary, then its sections. */
export function DocumentBody({
  kindLabel,
  date,
  doc,
  context,
}: {
  kindLabel: string;
  date?: string;
  doc: {
    title: string;
    fields?: Record<string, unknown>;
    blocks: { type: string; hidden?: boolean }[];
  };
  context: PortalBlockContext;
}) {
  const summary = typeof doc.fields?.summary === "string" ? doc.fields.summary : undefined;
  const blocks = visiblePortalBlocks(doc);
  return (
    <article className={d.doc}>
      <header className={d.head}>
        <p className={d.kicker}>
          {kindLabel}
          {date && ` · ${date}`}
        </p>
        <h1 className={d.title}>{doc.title || "Untitled"}</h1>
        {summary && <p className={d.summary}>{summary}</p>}
      </header>
      {blocks.length ? (
        <PortalBlocks blocks={blocks} context={context} />
      ) : (
        <p className={d.empty}>Add a section in the editor and it appears here.</p>
      )}
    </article>
  );
}

export const longDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
