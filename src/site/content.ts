import type { Block } from "@/blocks";

/**
 * The public site's content, carried over word for word from 1880consulting.com.
 * It lives in code until the CMS is built (PLAN Phase 2); then it moves into
 * the database and editors change it in 1880 Studio. A non-breaking space
 * ( ) keeps two words together on one line.
 */

export interface NavLink {
  label: string;
  href: string;
}

export interface SiteSettings {
  name: string;
  email: string;
  nav: NavLink[];
  cta: NavLink;
  social: NavLink[];
}

export const site: SiteSettings = {
  name: "1880 Consulting",
  email: "inquiries@1880consulting.com",
  nav: [
    { label: "What we do", href: "/#what-we-do" },
    { label: "Contact Us", href: "/contact" },
  ],
  cta: { label: "Send Message.", href: "/contact" },
  social: [
    { label: "LinkedIn", href: "https://www.linkedin.com/company/1880-consulting" },
    { label: "Instagram", href: "https://www.instagram.com/1880consulting" },
  ],
};

export interface PageContent {
  title: string;
  description: string;
  blocks: Block[];
}

export const home: PageContent = {
  title: "1880 Consulting | Strategic Marketing & Communications for Government Contractors",
  description:
    "1880 is a storytelling company. We help founders and executive teams at growth-stage government contractors tell their stories and grow.",
  blocks: [
    {
      type: "hero",
      title: "1880 is a storytelling company.",
      subtitle:
        "We bring together senior consultants and agency talent to help founders and executive teams tell their stories and grow.",
      button: { label: "Contact Us", href: "/#contact" },
    },
    {
      type: "statement",
      text: "We believe focus is important for any business, including ours.",
    },
    {
      type: "feature",
      heading: "We work solely with growth-stage government contractors in the federal market.",
      detail:
        "Understanding the challenges these businesses face when approaching graduation or competing in the full and open market, we founded 1880 to help.",
    },
    {
      type: "namesake",
      lead: "1880 is named for the year Mathilde C. Weil started the first woman-owned ad agency in the United States.",
      detail: "She was an immigrant, a widow, and smart.",
      close: "Her courage inspires us.",
    },
    {
      type: "services",
      anchor: "what-we-do",
      eyebrow: "// What we do",
      title: "Strategic Marketing & Communications",
      items: [
        "Positioning and Messaging",
        "Brand and Creative",
        "Communications",
        "Campaigns and Content",
        "Marketing Leadership and Operations",
      ],
      button: { label: "Learn more", href: "/#contact" },
    },
    {
      type: "contact-band",
      anchor: "contact",
      title: "Contact Us",
      body: "We love talking strategy. Send us a message if you’d like to strategize together.",
      button: { label: "Send Message.", href: "/contact" },
      showEmail: true,
    },
  ],
};

export const contactPage = {
  title: "Contact",
  heading: "Contact Us",
  intro: "We love talking strategy. Send us a message if you’d like to strategize together.",
  description:
    "We love talking strategy. Send 1880 a message if you’d like to strategize together.",
};
