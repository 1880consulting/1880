import { createHash, randomBytes } from "node:crypto";

/** A random 256-bit token for a cookie or a one-time link. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only this hash is stored, so a copy of the database can't be used to sign in. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
