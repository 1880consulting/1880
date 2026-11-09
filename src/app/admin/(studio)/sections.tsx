import {
  IconBriefcase,
  IconFileText,
  IconInbox,
  IconLayoutDashboard,
  IconListDetails,
  IconMenu2,
  IconPhoto,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import type { NavSection } from "@/cms/ui";

const icon = { size: 20, stroke: 2, "aria-hidden": true } as const;

/** 1880 Studio's sections. Each one gets built out in Phase 2 (PLAN §3.3). */
export const SECTIONS = {
  pages: {
    label: "Pages",
    icon: <IconFileText {...icon} />,
    empty: "Build pages from blocks and see them update live beside the editor.",
  },
  "case-studies": {
    label: "Case studies",
    icon: <IconBriefcase {...icon} />,
    empty: "Client stories with results, filterable by service.",
  },
  services: {
    label: "Services",
    icon: <IconListDetails {...icon} />,
    empty: "One page per service, from a shared template.",
  },
  media: {
    label: "Media",
    icon: <IconPhoto {...icon} />,
    empty: "Upload images once and reuse them anywhere. Alt text required.",
  },
  inquiries: {
    label: "Inquiries",
    icon: <IconInbox {...icon} />,
    empty: "Contact-form messages land here, and alerts go to the people chosen in Settings.",
  },
  menus: {
    label: "Menus and footer",
    icon: <IconMenu2 {...icon} />,
    empty: "Add, rename and reorder the site's navigation and footer links.",
  },
  people: {
    label: "People",
    icon: <IconUsers {...icon} />,
    empty: "Invite editors, change roles and remove access.",
  },
  settings: {
    label: "Settings",
    icon: <IconSettings {...icon} />,
    empty: "Inquiry alert recipients and other site-wide settings.",
  },
} as const;

export type SectionId = keyof typeof SECTIONS;

const link = (id: SectionId) => ({
  label: SECTIONS[id].label,
  href: `/admin/${id}`,
  icon: SECTIONS[id].icon,
});

export const NAV: NavSection[] = [
  {
    items: [
      { label: "Overview", href: "/admin", icon: <IconLayoutDashboard {...icon} /> },
      link("pages"),
      link("case-studies"),
      link("services"),
      link("media"),
      link("inquiries"),
    ],
  },
  { label: "Site", items: [link("menus")] },
  { label: "Team", items: [link("people"), link("settings")] },
];
