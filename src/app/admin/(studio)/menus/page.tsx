import { Suspense } from "react";
import { requireStaff } from "@/cms/auth";
import { getPublishedBySlug, listEntries } from "@/cms/content/store";
import { MenusEditor } from "@/cms/menus/MenusEditor";
import { getSetting } from "@/cms/settings";
import { PageHeader, Panel, Skeleton } from "@/cms/ui";
import { pageType } from "@/site/cms";
import { site } from "@/site/content";
import { BUILT_IN_MENUS } from "@/site/menus";
import { saveMenus } from "./actions";

export const metadata = { title: "Menus and footer" };

export default function MenusPage() {
  return (
    <>
      <PageHeader
        pretitle="1880 Studio"
        title="Menus and footer"
        description="The links at the top of every page, and in the footer. Saving publishes them straight away."
      />
      <Suspense
        fallback={
          <Panel>
            <Skeleton />
          </Panel>
        }
      >
        <Editor />
      </Suspense>
    </>
  );
}

/** Published pages, plus the sections of the home page that have a link name. */
async function suggestions() {
  const pages = (await listEntries(pageType.id)).filter((p) => p.status === "published");
  const out = pages.map((p) => ({ label: p.title, href: pageType.path(p.slug) }));
  out.push({ label: "Contact form", href: "/contact" });
  const home = await getPublishedBySlug(pageType.id, "");
  for (const b of home?.blocks ?? []) {
    if (typeof b.anchor === "string" && b.anchor)
      out.push({ label: `Home: ${b.anchor} section`, href: `/#${b.anchor}` });
  }
  return out;
}

async function Editor() {
  await requireStaff();
  const [stored, sugg] = await Promise.all([getSetting("site.menus"), suggestions()]);
  return (
    <MenusEditor
      initial={stored ?? BUILT_IN_MENUS}
      builtIn={stored === null}
      suggestions={sugg}
      email={site.email}
      viewSiteHref="/"
      save={saveMenus}
    />
  );
}
