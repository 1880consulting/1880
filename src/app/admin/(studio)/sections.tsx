import {
  IconBriefcase,
  IconBuilding,
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
  },
  "case-studies": {
    label: "Case studies",
    icon: <IconBriefcase {...icon} />,
  },
  services: {
    label: "Services",
    icon: <IconListDetails {...icon} />,
  },
  media: {
    label: "Media",
    icon: <IconPhoto {...icon} />,
  },
  inquiries: {
    label: "Inquiries",
    icon: <IconInbox {...icon} />,
  },
  menus: {
    label: "Menus and footer",
    icon: <IconMenu2 {...icon} />,
  },
  clients: {
    label: "Clients",
    icon: <IconBuilding {...icon} />,
  },
  people: {
    label: "People",
    icon: <IconUsers {...icon} />,
  },
  settings: {
    label: "Settings",
    icon: <IconSettings {...icon} />,
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
  { label: "Client portal", items: [link("clients")] },
  { label: "Team", items: [link("people"), link("settings")] },
];
