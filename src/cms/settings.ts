import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { menusSchema, type Menus } from "./menus/schema";

/** Every setting editors can change, with its shape and default. */
const SETTINGS = {
  /** Who gets the "new inquiry" email (PLAN D27). */
  "inquiries.alertRecipients": { schema: z.array(z.email()).max(20), fallback: [] as string[] },
  /** Menus and footer (PLAN D28). null until first saved: the site then shows its built-in ones. */
  "site.menus": { schema: menusSchema, fallback: null as Menus | null },
} as const;

export type SettingKey = keyof typeof SETTINGS;
type Value<K extends SettingKey> = z.infer<(typeof SETTINGS)[K]["schema"]>;
type Stored<K extends SettingKey> = Value<K> | (typeof SETTINGS)[K]["fallback"];

export async function getSetting<K extends SettingKey>(key: K): Promise<Stored<K>> {
  const [row] = await db()
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, key))
    .limit(1);
  const parsed = SETTINGS[key].schema.safeParse(row?.value);
  return (parsed.success ? parsed.data : SETTINGS[key].fallback) as Stored<K>;
}

export async function setSetting<K extends SettingKey>(key: K, value: Value<K>): Promise<void> {
  const clean = SETTINGS[key].schema.parse(value);
  await db()
    .insert(schema.settings)
    .values({ key, value: clean })
    .onDuplicateKeyUpdate({ set: { value: clean } });
}
