import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { hasActiveOwner } from "./service";

/**
 * Creating the very first owner from the browser (PLAN D47), for hosts where
 * running `npm run studio:owner` in a terminal is awkward. It works only
 * while Studio has no owner, and only with STUDIO_SETUP_TOKEN, a long random
 * secret set in the host's settings. Once an owner exists, it's gone.
 */

const MIN_TOKEN_LENGTH = 24;

function configuredToken(): string | null {
  const t = process.env.STUDIO_SETUP_TOKEN?.trim();
  return t && t.length >= MIN_TOKEN_LENGTH ? t : null;
}

/** Whether the setup page should exist right now. */
export async function setupAvailable(): Promise<boolean> {
  return configuredToken() !== null && !(await hasActiveOwner());
}

/** Compares in constant time, so the answer's timing gives nothing away. */
export function setupTokenMatches(input: string): boolean {
  const expected = configuredToken();
  if (!expected) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
