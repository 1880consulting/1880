/**
 * Adds a demo client to the portal, for trying it out and for reviews:
 * "Demo Client" at <portal>/demo, with one person, plus a second client
 * ("Northwind") that person can't see, so isolation is easy to check by hand.
 * Prints a sign-in link. Safe to run again.
 *
 *   npm run portal:seed
 *   npm run portal:seed -- --email you@example.com --name "Your Name"
 *
 * Uses DATABASE_URL (from .env.local, or the local Docker database).
 */
import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { closeDb, db, schema } from "@/lib/db";
import {
  addDocumentFile,
  createDocument,
  getDocument,
  publishDocument,
  saveDocumentDraft,
} from "@/lib/portal/documents";
import { addPerson, createTenant } from "@/lib/portal/manage";
import { issueClientToken } from "@/lib/portal/users";
import { parsePortalSubdomain } from "@/lib/routing";

const { values } = parseArgs({
  options: { email: { type: "string" }, name: { type: "string" } },
});
const email = values.email?.trim() || "demo@example.com";
const name = values.name?.trim() || "Dana Demo";

async function tenant(slug: string, name: string, accentColor: string) {
  const [found] = await db()
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, slug))
    .limit(1);
  return found?.id ?? (await createTenant({ name, slug, accentColor }));
}

/** A one-page PDF with a line of text, built by hand (no PDF library needed). */
function samplePdf(text: string): Buffer {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>",
  ];
  const stream = `BT /F1 28 Tf 72 700 Td (${text}) Tj ET`;
  objects[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

const SAMPLE_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Q3 campaign dashboard</title>
<style>
  body{margin:0;font-family:Georgia,serif;background:#fafaf8;color:#111}
  main{max-width:880px;margin:0 auto;padding:48px 24px}
  h1{font-weight:400;font-size:44px;margin:0 0 8px}
  .bars{display:grid;gap:12px;margin-top:32px}
  .bar{display:grid;grid-template-columns:120px 1fr 60px;align-items:center;gap:12px}
  .fill{height:22px;background:#111;transform-origin:left;transition:transform 1s}
  button{margin-top:24px;padding:10px 18px;border:1px solid #111;background:#fff;font:inherit;cursor:pointer}
  @media (prefers-reduced-motion:reduce){.fill{transition:none}}
</style></head>
<body><main>
<h1>Q3 campaign dashboard</h1>
<p>A sample interactive page. It runs its own script inside the portal's sealed frame.</p>
<div class="bars" id="bars"></div>
<button id="toggle">Show leads instead</button>
</main>
<script>
  const data = { visits: [["LinkedIn",82],["Email",64],["Search",41],["Events",23]],
                 leads: [["LinkedIn",31],["Email",44],["Search",12],["Events",19]] };
  let key = "visits";
  function draw(){
    const max = Math.max(...data[key].map(d=>d[1]));
    document.getElementById("bars").innerHTML = data[key].map(([k,v]) =>
      '<div class="bar"><span>'+k+'</span><div class="fill" style="transform:scaleX('+(v/max)+')"></div><span>'+v+'</span></div>').join("");
    document.getElementById("toggle").textContent = key === "visits" ? "Show leads instead" : "Show visits instead";
  }
  document.getElementById("toggle").onclick = () => { key = key === "visits" ? "leads" : "visits"; draw(); };
  draw();
</script>
</body></html>`;

/** Three sample documents for the demo client, one per format. Skipped if it has any. */
async function sampleDocuments(tenantId: string) {
  const [existing] = await db()
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.tenantId, tenantId))
    .limit(1);
  if (existing) return;

  const report = await createDocument({
    tenantId,
    title: "Q3 marketing report",
    kind: "report",
    format: "blocks",
    authorId: "seed",
  });
  const found = (await getDocument(report))!;
  const deck = await addDocumentFile(
    report,
    "attachment",
    {
      filename: "Q3 numbers.csv",
      data: Buffer.from("channel,visits,leads\nLinkedIn,82,31\nEmail,64,44\n"),
    },
    "seed",
  );
  await saveDocumentDraft(
    report,
    {
      ...found.draft,
      fields: { summary: "How the quarter went, what worked, and what we'll do next." },
      blocks: [
        {
          id: "s1",
          type: "stats",
          heading: "The quarter in numbers",
          stats: [
            { value: "+38%", label: "Website visits, quarter on quarter" },
            { value: "126", label: "Qualified leads" },
            { value: "4", label: "Award submissions" },
          ],
        },
        {
          id: "t1",
          type: "text",
          heading: "What worked",
          body: "LinkedIn carried the quarter: the founder series doubled engagement.\n\n- Founder posts, twice a week\n- The capabilities one-pager\n- Two webinars with partners",
        },
        {
          id: "m1",
          type: "timeline",
          heading: "Next quarter",
          items: [
            { when: "October", title: "Refresh the capabilities deck", done: true },
            { when: "November", title: "Launch the case study series" },
            { when: "December", title: "Year-in-review campaign", detail: "Email and LinkedIn." },
          ],
        },
        { id: "f1", type: "files", heading: "Downloads", files: [deck.id] },
      ],
    },
    found.document.draftVersionId,
    "seed",
  );
  await publishDocument(report);

  const page = await createDocument({
    tenantId,
    title: "Q3 campaign dashboard",
    kind: "report",
    format: "interactive",
    authorId: "seed",
  });
  await addDocumentFile(
    page,
    "interactive",
    { filename: "dashboard.html", data: Buffer.from(SAMPLE_PAGE) },
    "seed",
  );
  await publishDocument(page);

  const proposal = await createDocument({
    tenantId,
    title: "2027 brand proposal",
    kind: "proposal",
    format: "file",
    authorId: "seed",
  });
  await addDocumentFile(
    proposal,
    "file",
    { filename: "2027 brand proposal.pdf", data: samplePdf("2027 brand proposal (sample)") },
    "seed",
  );
  await publishDocument(proposal);
}

try {
  const demo = await tenant("demo", "Demo Client", "#1f6feb");
  const northwind = await tenant("northwind", "Northwind", "#b35900");
  const { userId } = await addPerson(demo, { email, name }, "seed");
  await addPerson(northwind, { email: "nora@northwind.example", name: "Nora North" }, "seed");
  await sampleDocuments(demo);
  const token = await issueClientToken(userId, "invite");
  const sub = parsePortalSubdomain(process.env.PORTAL_SUBDOMAIN);
  const origin =
    process.env.PORTAL_URL ??
    (process.env.SITE_URL
      ? new URL(process.env.SITE_URL).origin.replace("://", `://${sub}.`)
      : `http://${sub}.localhost:3000`);
  console.info(`Demo client ready: ${origin}/demo`);
  console.info(`Sign in as ${name} <${email}> (works once, for 7 days):`);
  console.info(`${origin}/auth?token=${token}&next=%2Fdemo`);
} finally {
  await closeDb();
}
