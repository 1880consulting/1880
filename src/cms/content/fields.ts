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
      case "array":
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

export function blockFields(def: BlockDefinition): Field[] {
  return toFields(
    z.toJSONSchema(def.schema, { io: "input", unrepresentable: "any" }) as JsonSchema,
  );
}
