import { z } from "zod";

/**
 * The content engine's building blocks (PLAN §3.2). Nothing here knows about
 * 1880: a site passes its own content types and blocks in (src/site/cms.ts).
 */

/** A page section editors can add: a component's data shape plus how it's labeled in Studio. */
export interface BlockDefinition {
  type: string;
  label: string;
  description?: string;
  /** zod object with `type: z.literal(type)`. Field labels come from `.meta({ title, description })`. */
  schema: z.ZodObject;
  /** Starting values for a newly added block (without `type`). */
  defaults: Record<string, unknown>;
}

export function defineBlock<S extends z.ZodObject>(def: {
  type: string;
  label: string;
  description?: string;
  schema: S;
  defaults: Omit<z.input<S>, "type">;
}): BlockDefinition {
  return def as BlockDefinition;
}

/** A kind of entry: pages now; case studies, services later. */
export interface ContentType {
  id: string;
  label: string;
  plural: string;
  /** The public address of an entry. */
  path(slug: string): string;
  /** Addresses that belong to the app and can't be used. */
  reservedSlugs: string[];
  blocks: BlockDefinition[];
  /**
   * The type's own fields (e.g. a case study's client and summary): a zod
   * object labeled with `.meta()`, like a block. Studio builds their form.
   */
  fields?: z.ZodObject;
  /** Starting values for those fields on a new entry. */
  fieldDefaults?: Record<string, unknown>;
  /** Must an entry have at least one section to go live? Default true. */
  requiresBlocks?: boolean;
  /** May an entry live at the type's root address (slug "")? Only pages' home. */
  allowHome?: boolean;
}

/** A block as stored in a version: its fields, plus an id and a hidden switch. */
export const storedBlockSchema = z.looseObject({
  id: z.string().min(1).max(40),
  type: z.string().min(1).max(40),
  hidden: z.boolean().optional(),
});
export type StoredBlock = z.infer<typeof storedBlockSchema>;

/**
 * A version's document. Drafts may be incomplete (that's what drafts are for);
 * `validateForPublish` holds the full rules.
 */
export const docSchema = z.object({
  title: z.string().max(200),
  seo: z
    .object({
      title: z.string().max(120).optional(),
      description: z.string().max(200).optional(),
      /** Media id of the image shown when the page is shared (otherwise its cover, if any). */
      image: z.string().max(36).optional(),
      /** Ask search engines not to list this page. */
      noindex: z.boolean().optional(),
    })
    .default({}),
  blocks: z.array(storedBlockSchema).max(100),
  /** The content type's own fields (see ContentType.fields). */
  fields: z.record(z.string(), z.unknown()).optional(),
});
export type EntryDoc = z.infer<typeof docSchema>;

export const emptyDoc = (title: string, fields: Record<string, unknown> = {}): EntryDoc => ({
  title,
  seo: {},
  blocks: [],
  fields,
});

/** Lowercase words joined by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

export interface Issue {
  path: (string | number)[];
  message: string;
}

/** The full rules a draft must meet before it can go live. */
/** `slug` is left out for types without addresses of their own (portal documents). */
export function validateForPublish(type: ContentType, doc: EntryDoc, slug?: string): Issue[] {
  const issues: Issue[] = [];
  if (!doc.title.trim())
    issues.push({ path: ["title"], message: `Give the ${type.label.toLowerCase()} a title.` });
  if (slug !== undefined) {
    const slugError = checkSlug(type, slug, { allowHome: type.allowHome });
    if (slugError) issues.push({ path: ["slug"], message: slugError });
  }
  if (type.fields) {
    const result = type.fields.safeParse(doc.fields ?? {});
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push({
          path: ["fields", ...issue.path.map((p) => (typeof p === "symbol" ? String(p) : p))],
          message: friendly(issue),
        });
      }
    }
  }
  if (type.requiresBlocks !== false && doc.blocks.filter((b) => !b.hidden).length === 0) {
    issues.push({ path: ["blocks"], message: "Add at least one section." });
  }
  doc.blocks.forEach((block, i) => {
    if (block.hidden) return;
    const def = type.blocks.find((b) => b.type === block.type);
    if (!def) {
      issues.push({ path: ["blocks", i], message: `Unknown section type "${block.type}".` });
      return;
    }
    const result = def.schema.safeParse(block);
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push({
          path: ["blocks", i, ...issue.path.map((p) => (typeof p === "symbol" ? String(p) : p))],
          message: friendly(issue),
        });
      }
    }
  });
  return issues;
}

function friendly(issue: z.core.$ZodIssue): string {
  if (issue.code === "too_small" && issue.origin === "string") return "Fill this in.";
  if (issue.code === "too_small" && issue.origin === "array")
    return `Add at least ${issue.minimum}.`;
  if (issue.code === "too_big" && issue.origin === "string")
    return `Use ${issue.maximum} characters or fewer.`;
  if (issue.code === "too_big" && issue.origin === "array") return `Use ${issue.maximum} or fewer.`;
  if (issue.code === "invalid_type") return "Fill this in.";
  return issue.message;
}

/** Why a slug can't be used, or null if it can. */
export function checkSlug(
  type: ContentType,
  slug: string,
  opts: { allowHome?: boolean } = {},
): string | null {
  if (slug === "") return opts.allowHome ? null : "Choose an address for this page.";
  if (slug.length > 80) return "Keep the address to 80 characters or fewer.";
  if (!SLUG_PATTERN.test(slug))
    return "Use lowercase letters, numbers and single hyphens, like about-us.";
  if (type.reservedSlugs.includes(slug))
    return `"${slug}" is used by the site already. Choose another address.`;
  return null;
}
