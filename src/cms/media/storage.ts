import "server-only";
import { eq, like } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * Where media files live (PLAN §2.4). MySQL to start; an S3-compatible
 * adapter (e.g. Cloudflare R2) can replace it later behind this interface,
 * chosen by config. Nothing is ever written to the server's disk.
 */
export interface Storage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ data: Buffer; contentType: string } | null>;
  /** Removes every file whose key starts with `prefix`. */
  deletePrefix(prefix: string): Promise<void>;
}

const { mediaBlobs: blobs } = schema;

export const mysqlStorage: Storage = {
  async put(key, data, contentType) {
    await db()
      .insert(blobs)
      .values({ key, data, contentType, bytes: data.length })
      .onDuplicateKeyUpdate({ set: { data, contentType, bytes: data.length } });
  },
  async get(key) {
    const [row] = await db()
      .select({ data: blobs.data, contentType: blobs.contentType })
      .from(blobs)
      .where(eq(blobs.key, key))
      .limit(1);
    return row ?? null;
  },
  async deletePrefix(prefix) {
    await db()
      .delete(blobs)
      .where(like(blobs.key, `${prefix.replace(/[%_\\]/g, "\\$&")}%`));
  },
};

export function storage(): Storage {
  // MEDIA_STORAGE=mysql is the only option today.
  return mysqlStorage;
}
