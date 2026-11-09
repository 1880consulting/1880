/** Uptime check: GET /api/health. Database checks get added with Drizzle. */
export function GET() {
  return Response.json({ ok: true });
}
