import { connection } from "next/server";
import { checkHealth } from "@/lib/health";

/**
 * Uptime check: GET (or HEAD) /api/health. 200 when the site and its database
 * are working, 503 when they're not. Never cached: every request checks again.
 */
export async function GET() {
  await connection();
  const health = await checkHealth();
  return Response.json(health, {
    status: health.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function HEAD() {
  await connection();
  const health = await checkHealth();
  return new Response(null, {
    status: health.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
