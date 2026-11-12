import { IconHistory, IconLock } from "@tabler/icons-react";
import Link from "next/link";
import { Suspense } from "react";
import { requireStaff } from "@/cms/auth";
import { longDate } from "@/cms/format";
import {
  Badge,
  buttonClass,
  controls as c,
  EmptyState,
  PageHeader,
  Panel,
  Skeleton,
} from "@/cms/ui";
import { activityPeople, listActivity } from "../_activity/activity";

export const metadata = { title: "Activity" };

/** Everything that happened in Studio and the hub, for owners (PLAN D50). */
export default function ActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  return (
    <>
      <PageHeader
        pretitle="Team"
        title="Activity"
        description="Who did what, in Studio and the client hub. Kept for good."
      />
      <Suspense
        fallback={
          <Panel>
            <Skeleton lines={8} />
          </Panel>
        }
      >
        <Activity searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const PAGE = 50;
const day = (s: unknown) =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : undefined;

async function Activity({ searchParams }: Pick<PageProps<"/admin/activity">, "searchParams">) {
  const me = await requireStaff();
  if (me.role !== "owner")
    return (
      <EmptyState
        icon={<IconLock size={24} stroke={2} aria-hidden />}
        title="Only owners see the activity log"
        text="Ask an owner if you need to know who changed something."
      />
    );

  const sp = await searchParams;
  const who = typeof sp.who === "string" ? sp.who : "";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const fromDay = day(sp.from);
  const toDay = day(sp.to);
  const before =
    typeof sp.before === "string" && /^\d+$/.test(sp.before) ? Number(sp.before) : undefined;

  // Searching matches the written-out sentence (names and titles included), so it
  // looks through a larger window of records and keeps the matches.
  const window = await listActivity({
    who: who || undefined,
    from: fromDay,
    to: toDay ? new Date(toDay.getTime() + 86400000) : undefined,
    before,
    limit: q ? 500 : PAGE,
  });
  const needle = q.toLowerCase();
  const items = (
    q
      ? window.filter((i) => `${i.who} ${i.what} ${i.action}`.toLowerCase().includes(needle))
      : window
  ).slice(0, PAGE);
  const people = await activityPeople();
  const last = items.at(-1);
  const older =
    last && (q ? window.length === 500 || items.length === PAGE : window.length === PAGE)
      ? `/admin/activity?${new URLSearchParams({
          ...(who && { who }),
          ...(q && { q }),
          ...(typeof sp.from === "string" && fromDay && { from: sp.from }),
          ...(typeof sp.to === "string" && toDay && { to: sp.to }),
          before: String(last.id),
        })}`
      : null;

  return (
    <>
      <Panel>
        <form method="get" action="/admin/activity" className={c.filters}>
          <div className={c.field}>
            <label htmlFor="act-q" className={c.label}>
              Search
            </label>
            <input
              id="act-q"
              name="q"
              type="search"
              className={c.input}
              defaultValue={q}
              placeholder="A name, a page, “published”…"
            />
          </div>
          <div className={c.field}>
            <label htmlFor="act-who" className={c.label}>
              Person
            </label>
            <select id="act-who" name="who" className={c.input} defaultValue={who}>
              <option value="">Everyone</option>
              {people.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className={c.field}>
            <label htmlFor="act-from" className={c.label}>
              From
            </label>
            <input
              id="act-from"
              name="from"
              type="date"
              className={c.input}
              defaultValue={fromDay ? (sp.from as string) : ""}
            />
          </div>
          <div className={c.field}>
            <label htmlFor="act-to" className={c.label}>
              To
            </label>
            <input
              id="act-to"
              name="to"
              type="date"
              className={c.input}
              defaultValue={toDay ? (sp.to as string) : ""}
            />
          </div>
          <div className={c.actions} style={{ alignSelf: "end", marginBottom: 16 }}>
            <button type="submit" className={buttonClass("primary")}>
              Filter
            </button>
            {(who || q || fromDay || toDay) && (
              <Link href="/admin/activity" className={buttonClass("ghost")}>
                Clear
              </Link>
            )}
          </div>
        </form>
      </Panel>
      <div style={{ height: 24 }} />
      {items.length === 0 ? (
        <EmptyState
          icon={<IconHistory size={24} stroke={2} aria-hidden />}
          title="Nothing matches"
          text="Try another person, a wider date range, or fewer words."
        />
      ) : (
        <Panel flush>
          <table className={c.table}>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Who</th>
                <th scope="col">What</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td className={`${c.meta} ${c.num}`} style={{ whiteSpace: "nowrap" }}>
                    {longDate(i.at)}
                  </td>
                  <td>
                    {i.who} {i.actorType === "client" && <Badge tone="info">Hub</Badge>}
                  </td>
                  <td>{i.href ? <Link href={i.href}>{i.what}</Link> : i.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
      {older && (
        <p style={{ marginTop: 16 }}>
          <Link href={older} className={buttonClass("secondary")}>
            Older activity
          </Link>
        </p>
      )}
    </>
  );
}
