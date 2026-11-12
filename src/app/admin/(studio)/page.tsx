import Link from "next/link";
import { Suspense } from "react";
import { requireStaff } from "@/cms/auth";
import { shortDate, timeAgo } from "@/cms/format";
import { countInquiries, listInquiries } from "@/cms/inquiries";
import { Badge, controls as c, PageHeader, Panel, Skeleton, StatTile } from "@/cms/ui";
import { listActivity, pendingDrafts, weekNumbers } from "./_activity/activity";

/** Studio's front page (PLAN D50): what changed, what's waiting, what came in. */
export default function AdminHomePage() {
  return (
    <>
      <PageHeader pretitle="1880 Studio" title="What's happening" />
      <Suspense fallback={<Skeleton lines={6} />}>
        <Overview />
      </Suspense>
    </>
  );
}

async function Overview() {
  const me = await requireStaff();
  const [counts, week, waiting, activity, latest] = await Promise.all([
    countInquiries(),
    weekNumbers(),
    pendingDrafts(50),
    listActivity({ contentOnly: true, limit: 12 }),
    listInquiries("new", 5),
  ]);

  return (
    <>
      <div className={c.stats}>
        <StatTile label="New inquiries" value={counts.new} href="/admin/inquiries" />
        <StatTile label="Waiting to be published" value={waiting.length} href="#waiting" />
        <StatTile label="Published this week" value={week.published} />
        <StatTile
          label="Hub documents opened this week"
          value={week.opened}
          href="/admin/clients"
        />
      </div>
      <div className={c.split} style={{ marginTop: 24 }}>
        <Panel
          title="Recent activity"
          actions={
            me.role === "owner" ? (
              <Link href="/admin/activity" className={c.meta}>
                See everything
              </Link>
            ) : undefined
          }
        >
          {activity.length === 0 ? (
            <p className={c.meta} style={{ margin: 0 }}>
              Nothing yet. Publish a page or a client document and it shows up here.
            </p>
          ) : (
            <ul className={c.feed}>
              {activity.map((a) => (
                <li key={a.id}>
                  <span>
                    <strong>{a.who}</strong> {a.href ? <Link href={a.href}>{a.what}</Link> : a.what}
                  </span>
                  <time className={c.meta} dateTime={a.at.toISOString()}>
                    {timeAgo(a.at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <div style={{ display: "grid", gap: 24, alignContent: "start" }}>
          <div id="waiting">
            <Panel title="Waiting to be published">
              {waiting.length === 0 ? (
                <p className={c.meta} style={{ margin: 0 }}>
                  Everything is live. Nice.
                </p>
              ) : (
                <ul className={c.feed}>
                  {waiting.slice(0, 8).map((w) => (
                    <li key={w.key}>
                      <span>
                        <Link href={w.href}>{w.title}</Link>{" "}
                        <span className={c.meta}>
                          {w.kind} · {w.live ? "changes not live yet" : "never published"}
                        </span>
                      </span>
                      <time className={c.meta} dateTime={w.updatedAt.toISOString()}>
                        {timeAgo(w.updatedAt)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
              {waiting.length > 8 && (
                <p className={c.meta} style={{ marginBottom: 0 }}>
                  And {waiting.length - 8} more.
                </p>
              )}
            </Panel>
          </div>
          <Panel
            title="New inquiries"
            actions={
              <Link href="/admin/inquiries" className={c.meta}>
                Inbox
              </Link>
            }
          >
            {latest.length === 0 ? (
              <p className={c.meta} style={{ margin: 0 }}>
                You&apos;re all caught up.
              </p>
            ) : (
              <ul className={c.feed}>
                {latest.map((i) => (
                  <li key={i.id}>
                    <span>
                      <Link href={`/admin/inquiries/${i.id}`}>{i.name}</Link>{" "}
                      <Badge tone="info">New</Badge>
                      <span className={c.preview} style={{ display: "block" }}>
                        {i.message}
                      </span>
                    </span>
                    <time className={c.meta} dateTime={i.createdAt.toISOString()}>
                      {shortDate(i.createdAt)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
