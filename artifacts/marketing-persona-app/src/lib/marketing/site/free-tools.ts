export type FreeToolSlug =
  | "meta-checker"
  | "llms-txt"
  | "robots-txt"
  | "sitemap-checker"
  | "serp-preview";

export type FreeToolDef = {
  slug: FreeToolSlug;
  title: string;
  shortDesc: string;
  metaTitle: string;
  metaDescription: string;
  heroLine1: string;
  heroLine2: string;
  heroDescription: string;
  kind: "api" | "client";
  api?: string;
};

export const FREE_TOOLS: Record<FreeToolSlug, FreeToolDef> = {
  "meta-checker": {
    slug: "meta-checker",
    title: "Meta Description Checker",
    shortDesc: "Score your title and meta description.",
    metaTitle: "Free Meta Description Checker | goals.ac",
    metaDescription:
      "Check any page's title tag and meta description for length, keyword usage, and AI-search readiness. Free, no account required.",
    heroLine1: "Meta description",
    heroLine2: "checker",
    heroDescription:
      "Paste a URL. You get a score on title/meta length, spam signals, title–H1 overlap, and Open Graph consistency.",
    kind: "api",
    api: "/api/tools/meta-checker",
  },
  "llms-txt": {
    slug: "llms-txt",
    title: "llms.txt Generator",
    shortDesc: "Draft llms.txt from your site, check if one exists, and download it.",
    metaTitle: "Free llms.txt Generator | goals.ac",
    metaDescription:
      "Generate an llms.txt file from your sitemap and homepage, check whether one already exists, and download a ready-to-publish draft. Free, no account required.",
    heroLine1: "llms.txt",
    heroLine2: "generator",
    heroDescription:
      "Paste a URL. We pull title, summary, and priority pages from your sitemap (or homepage links), check for an existing /llms.txt, and hand you a draft you can copy or download.",
    kind: "api",
    api: "/api/tools/llms-txt",
  },
  "robots-txt": {
    slug: "robots-txt",
    title: "Robots.txt Checker",
    shortDesc: "Parse robots.txt and flag blocking rules.",
    metaTitle: "Free Robots.txt Checker | goals.ac",
    metaDescription:
      "Parse any site's robots.txt, flag rules that block search or AI crawlers, and spot misconfigurations. Free, no account required.",
    heroLine1: "Robots.txt",
    heroLine2: "checker",
    heroDescription:
      "Fetch and parse your robots.txt to see which crawlers are allowed, which are blocked, and whether you're accidentally hiding pages from search engines or AI bots.",
    kind: "api",
    api: "/api/tools/robots",
  },
  "sitemap-checker": {
    slug: "sitemap-checker",
    title: "Sitemap Checker",
    shortDesc: "Validate your sitemap.xml URL count.",
    metaTitle: "Free Sitemap Checker | goals.ac",
    metaDescription:
      "Validate your sitemap.xml, count indexed URLs, and catch broken sitemap references. Free, no account required.",
    heroLine1: "Sitemap",
    heroLine2: "checker",
    heroDescription:
      "Validate your sitemap.xml in seconds. Confirm it parses, count the URLs inside, and check that search engines can discover your pages.",
    kind: "api",
    api: "/api/tools/sitemap",
  },
  "serp-preview": {
    slug: "serp-preview",
    title: "SERP Snippet Preview",
    shortDesc: "Preview how your title and description appear in Google.",
    metaTitle: "Free SERP Snippet Preview | goals.ac",
    metaDescription:
      "Preview how your title tag and meta description will look in Google search results before you publish. Free, no account required.",
    heroLine1: "SERP snippet",
    heroLine2: "preview",
    heroDescription:
      "Type your title and meta description and see how the snippet renders in Google. Catch truncation before the page goes live.",
    kind: "client",
  },
};

export const FREE_TOOL_LIST: FreeToolDef[] = Object.values(FREE_TOOLS);

export function freeToolPath(slug: FreeToolSlug) {
  return `/free-tools/${slug}`;
}
