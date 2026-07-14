export type MarketingCaseStudy = {
  slug: string;
  company: string;
  industry: string;
  vertical: string;
  metric: string;
  value: string;
  period: string;
  summary: string;
  quote?: string;
  quoteAuthor?: string;
  methodology: string[];
  metrics: Array<{ label: string; before: string; after: string }>;
  verifyLinks?: Array<{ label: string; href: string }>;
};

export const MARKETING_CASE_STUDIES: MarketingCaseStudy[] = [
  {
    slug: "health-wellness-shopify",
    company: "Health & wellness brand (SMB)",
    industry: "Health / e-commerce",
    vertical: "E-commerce",
    metric: "Blog clicks (GSC)",
    value: "+48%",
    period: "3 months",
    summary:
      "Content Autopilot with daily draft publish to Shopify blog. Clicks grew from 13.4K to 19.8K; impressions +77%. Editorial review kept YMYL topics compliant.",
    quote: "We finally have a content rhythm we can trust — drafts land in Shopify every week without our team writing from scratch.",
    quoteAuthor: "Head of Growth (anonymized)",
    methodology: [
      "Brand scan + 30-day content calendar from product catalog",
      "Daily autopilot (draft mode) with humanization pass",
      "Shopify blog publish via connector",
      "Weekly GEO re-audit on money pages",
    ],
    metrics: [
      { label: "GSC clicks", before: "13.4K/mo", after: "19.8K/mo" },
      { label: "Impressions", before: "445K", after: "787K" },
      { label: "Avg. position", before: "9.3", after: "6.5" },
    ],
    verifyLinks: [
      { label: "Request GSC verification", href: "/contact" },
      { label: "Free GEO audit", href: "/geo-audit" },
    ],
  },
  {
    slug: "local-services-wordpress",
    company: "Local services contractor",
    industry: "Home services",
    vertical: "Local services",
    metric: "Organic sessions",
    value: "+62%",
    period: "5 months",
    summary:
      "30-day calendar from brand scan, WordPress plugin publish, internal link clusters. First inbound call attributed to autopilot article in week 8.",
    methodology: [
      "Location + service keyword clusters",
      "WordPress HMAC plugin auto-publish",
      "Internal link hub across 24 supporting articles",
    ],
    metrics: [
      { label: "Organic sessions", before: "820/mo", after: "1,328/mo" },
      { label: "Indexed pages", before: "12", after: "36" },
      { label: "Top-10 keywords", before: "4", after: "19" },
    ],
    verifyLinks: [{ label: "Book discovery call", href: "/contact" }],
  },
  {
    slug: "hr-tech-saas",
    company: "Series B HR tech SaaS",
    industry: "B2B SaaS",
    vertical: "SaaS",
    metric: "AI citation rate",
    value: "8% → 22%",
    period: "6 months",
    summary:
      "12-month roadmap, 36 pillar + supporting articles, GSC + GA4 reporting. AI citation rate moved from 8% to 22% on target prompts.",
    methodology: [
      "12-month growth roadmap → content calendar",
      "LLM visibility tracking (4 engines)",
      "Citation-worthy long-form + FAQ schema",
    ],
    metrics: [
      { label: "GSC clicks", before: "+0% baseline", after: "+41%" },
      { label: "AI citation rate", before: "8%", after: "22%" },
      { label: "Articles published", before: "0", after: "36" },
    ],
    verifyLinks: [
      { label: "LLM visibility feature", href: "/llm-visibility" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    slug: "agency-multi-client",
    company: "Marketing agency (client program)",
    industry: "Agency",
    vertical: "Agency / partner",
    metric: "Client articles published",
    value: "52",
    period: "90 days",
    summary:
      "Three client projects on goals.ac — editorial review on every draft, CMS publish to Webflow and WordPress, monthly performance PDFs.",
    methodology: [
      "Multi-project org workspace",
      "Per-client brand voice skill docs",
      "Partner dashboard rollup metrics",
    ],
    metrics: [
      { label: "Client projects", before: "1", after: "3" },
      { label: "Articles published", before: "0", after: "52" },
      { label: "Avg. quality score", before: "—", after: "87/100" },
    ],
    verifyLinks: [
      { label: "For agencies", href: "/for-agencies" },
      { label: "Partner workspace", href: "/partner" },
    ],
  },
];

export function getCaseStudyBySlug(slug: string): MarketingCaseStudy | undefined {
  return MARKETING_CASE_STUDIES.find((s) => s.slug === slug);
}
