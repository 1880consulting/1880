import { z } from "zod";
import type { BlockDefinition } from "./types";

/**
 * Describes a block's edit form, derived from its zod schema (via JSON
 * Schema), so a new block needs no editor code. Plain data, safe to pass to
 * the client.
 */
export type Field =
  | {
      kind: "text";
      key: string;
      label: string;
      help?: string;
      required: boolean;
      maxLength?: number;
      multiline: boolean;
    }
  | { kind: "boolean"; key: string; label: string; help?: string }
  | { kind: "image"; key: string; label: string; help?: string; required: boolean }
  | {
      kind: "number";
      key: string;
      label: string;
      help?: string;
      required: boolean;
      min?: number;
      max?: number;
    }
  /** Pick other entries (e.g. a case study's services). Stores their ids. */
  | { kind: "refs"; key: string; label: string; help?: string; ref: string; max?: number }
  | {
      kind: "select";
      key: string;
      label: string;
      help?: string;
      required: boolean;
      options: string[];
    }
  | {
      kind: "list";
      key: string;
      label: string;
      help?: string;
      min?: number;
      max?: number;
      maxLength?: number;
    }
  /** A repeatable group: a list of items, each with the same fields (e.g. stat tiles). */
  | {
      kind: "items";
      key: string;
      label: string;
      help?: string;
      /** What to call one item, e.g. "Stat". From `.meta({ itemLabel })`. */
      itemLabel: string;
      min?: number;
      max?: number;
      fields: Field[];
    }
  | {
      kind: "group";
      key: string;
      label: string;
      help?: string;
      required: boolean;
      fields: Field[];
    };

interface JsonSchema {
  type?: string;
  title?: string;
  description?: string;
  multiline?: boolean;
  /** Marks a string field as an image from the media library (its value is the image's id). */
  media?: boolean;
  /** Marks an array of ids as references to entries of this content type. */
  ref?: string;
  /** For a list of objects: what to call one item. */
  itemLabel?: string;
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  minLength?: number;
  minItems?: number;
  maxItems?: number;
  enum?: string[];
  const?: unknown;
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
}

const humanize = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

function toFields(schema: JsonSchema): Field[] {
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {}).flatMap(([key, prop]): Field[] => {
    if (prop.const !== undefined) return []; // the block's `type`
    const base = { key, label: prop.title ?? humanize(key), help: prop.description };
    if (prop.enum)
      return [{ kind: "select", ...base, required: required.has(key), options: prop.enum }];
    switch (prop.type) {
      case "string":
        if (prop.media)
          return [
            { kind: "image", ...base, required: required.has(key) && (prop.minLength ?? 0) > 0 },
          ];
        return [
          {
            kind: "text",
            ...base,
            required: required.has(key) && (prop.minLength ?? 0) > 0,
            maxLength: prop.maxLength,
            multiline: prop.multiline ?? (prop.maxLength ?? 0) > 160,
          },
        ];
      case "boolean":
        return [{ kind: "boolean", ...base }];
      case "number":
      case "integer":
        return [
          {
            kind: "number",
            ...base,
            required: required.has(key),
            min: prop.minimum,
            max: prop.maximum,
          },
        ];
      case "array":
        if (prop.ref) return [{ kind: "refs", ...base, ref: prop.ref, max: prop.maxItems }];
        if (prop.items?.type === "object")
          return [
            {
              kind: "items",
              ...base,
              itemLabel: prop.itemLabel ?? "Item",
              min: prop.minItems,
              max: prop.maxItems,
              fields: toFields(prop.items),
            },
          ];
        return [
          {
            kind: "list",
            ...base,
            min: prop.minItems,
            max: prop.maxItems,
            maxLength: prop.items?.maxLength,
          },
        ];
      case "object":
        return [{ kind: "group", ...base, required: required.has(key), fields: toFields(prop) }];
      default:
        return [];
    }
  });
}

/** The edit form for any labeled zod object (a block, or a content type's own fields). */
export function schemaFields(schema: z.ZodObject): Field[] {
  return toFields(z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as JsonSchema);
}

export function blockFields(def: BlockDefinition): Field[] {
  return schemaFields(def.schema);
}
