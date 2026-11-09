import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";

/** Every setting editors can change, with its shape and default. */
const SETTINGS = {
  /** Who gets the "new inquiry" email (PLAN D27). */
  "inquiries.alertRecipients": { schema: z.array(z.email()).max(20), fallback: [] as string[] },
} as const;

export type SettingKey = keyof typeof SETTINGS;
type Value<K extends SettingKey> = z.infer<(typeof SETTINGS)[K]["schema"]>;

export async function getSetting<K extends SettingKey>(key: K): Promise<Value<K>> {
  const [row] = await db()
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, key))
    .limit(1);
  const parsed = SETTINGS[key].schema.safeParse(row?.value);
  return (parsed.success ? parsed.data : SETTINGS[key].fallback) as Value<K>;
}

export async function setSetting<K extends SettingKey>(key: K, value: Value<K>): Promise<void> {
  const clean = SETTINGS[key].schema.parse(value);
  await db()
    .insert(schema.settings)
    .values({ key, value: clean })
    .onDuplicateKeyUpdate({ set: { value: clean } });
}
