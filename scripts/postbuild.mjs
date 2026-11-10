/**
 * After `next build`: the standalone server (PLAN §4.2) doesn't include the
 * static files it serves, so copy them next to it. Then `npm start` runs it.
 */
import { cpSync, existsSync } from "node:fs";

if (existsSync(".next/standalone")) {
  cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
  if (existsSync("public")) cpSync("public", ".next/standalone/public", { recursive: true });
  console.log("Copied static files into .next/standalone.");
}
