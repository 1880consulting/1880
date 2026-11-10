import type { ContentTypeId } from "@/site/cms";

/** Where each content type lives in Studio, and how its addresses read. */
export const STUDIO: Record<
  ContentTypeId,
  { base: string; description: string; addressPrefix: string; livePrefix: string; singular: string }
> = {
  page: {
    base: "/admin/pages",
    description: "Build pages from sections, preview them, and publish when they're ready.",
    addressPrefix: "1880.io/",
    livePrefix: "/",
    singular: "page",
  },
  work: {
    base: "/admin/case-studies",
    description: "Client stories for the work page, with their results and the services they show.",
    addressPrefix: "1880.io/work/",
    livePrefix: "/work/",
    singular: "case study",
  },
  service: {
    base: "/admin/services",
    description: "One page per service, listed on the services page in the order you set.",
    addressPrefix: "1880.io/services/",
    livePrefix: "/services/",
    singular: "service",
  },
};
