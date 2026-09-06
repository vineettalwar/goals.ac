import type { ContentFormatType } from "@/components/content-studio/content-studio-format-data";

export type GeoIssueLike = {
  check: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  fix: string;
};

export type GeoContentRecommendation = {
  id: string;
  title: string;
  formatType: ContentFormatType;
  keyword: string;
  angleHint: string;
  reason: string;
  relatedCheck: string;
  priority: "high" | "medium";
};

export type GeoAuditRecommendationContext = {
  url: string;
  pageTitle?: string | null;
  schemaTypes?: string[];
  issues: GeoIssueLike[];
};

function topicLabel(url: string, pageTitle?: string | null): string {
  if (pageTitle?.trim()) {
    const segment = pageTitle.split(/\s*[|\-–—:]\s*/)[0]?.trim();
    if (segment) return segment;
  }

  try {
    const parsed = new URL(url);
    const slug = parsed.pathname.split("/").filter(Boolean).pop();
    if (slug) {
      return slug
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] ?? "your site";
  }
}

function flattenSchemaTypes(schemaTypes: string[] | undefined): string[] {
  if (!schemaTypes?.length) return [];
  return schemaTypes.flatMap((entry) => {
    if (Array.isArray(entry)) return entry.map(String);
    return [String(entry)];
  });
}

function hasFaqSchema(schemaTypes: string[] | undefined): boolean {
  return flattenSchemaTypes(schemaTypes).some((type) => type.toLowerCase().includes("faq"));
}

function issueMap(issues: GeoIssueLike[]): Map<string, GeoIssueLike> {
  return new Map(issues.map((issue) => [issue.check, issue]));
}

export function geoAuditContentRecommendations(
  context: GeoAuditRecommendationContext,
): GeoContentRecommendation[] {
  const { url, pageTitle, schemaTypes, issues } = context;
  const byCheck = issueMap(issues);
  const topic = topicLabel(url, pageTitle);
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return topic;
    }
  })();

  const recs: GeoContentRecommendation[] = [];
  const seen = new Set<string>();

  function push(rec: GeoContentRecommendation) {
    const key = `${rec.formatType}:${rec.title.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    recs.push(rec);
  }

  const faqIssue = byCheck.get("FAQ Schema");
  const schemaIssue = byCheck.get("Schema.org Markup");
  if (
    (faqIssue && faqIssue.status !== "pass") ||
    (schemaIssue?.status === "pass" && !hasFaqSchema(schemaTypes))
  ) {
    push({
      id: "faq-schema",
      title: `${topic}: Frequently Asked Questions`,
      formatType: "faq_article",
      keyword: `${topic} FAQ`.slice(0, 80),
      angleHint:
        `Write the FAQ buyers ask about ${topic} on ${host}. ` +
        "Add FAQPage JSON-LD so crawlers and answer engines can cite the Q&A.",
      reason: "No FAQPage markup — answer engines have nothing concrete to quote.",
      relatedCheck: faqIssue?.check ?? "Schema.org Markup",
      priority: "high",
    });
  }

  const metaIssue = byCheck.get("Meta Description");
  if (metaIssue && metaIssue.status !== "pass") {
    push({
      id: "meta-description",
      title: `${topic} — landing page copy`,
      formatType: "landing_page_copy",
      keyword: topic,
      angleHint:
        `Rewrite hero, value props, and meta description for ${url}. ` +
        "Keep the meta description between 50 and 160 characters; match the H1 to the main query.",
      reason: metaIssue.detail,
      relatedCheck: "Meta Description",
      priority: metaIssue.status === "fail" ? "high" : "medium",
    });
  }

  const titleIssue = byCheck.get("Page Title");
  if (titleIssue && titleIssue.status !== "pass") {
    push({
      id: "page-title",
      title: `${topic} — title and pillar rewrite`,
      formatType: "pillar_page",
      keyword: topic,
      angleHint:
        `Build a pillar page for ${topic} with a title tag of 30–60 characters, ` +
        "one clear H1, and a short summary above the fold.",
      reason: titleIssue.detail,
      relatedCheck: "Page Title",
      priority: titleIssue.status === "fail" ? "high" : "medium",
    });
  }

  if (schemaIssue && schemaIssue.status === "fail") {
    push({
      id: "schema-org",
      title: `${topic} — guide with schema markup`,
      formatType: "guide",
      keyword: `${topic} guide`.slice(0, 80),
      angleHint:
        `Long-form guide on ${topic} with Organization, WebSite, and Article JSON-LD. ` +
        "Use real section headings so crawlers can parse the page.",
      reason: schemaIssue.detail,
      relatedCheck: "Schema.org Markup",
      priority: "high",
    });
  }

  const h1Issue = byCheck.get("H1 Tag");
  if (h1Issue && h1Issue.status !== "pass") {
    push({
      id: "h1-structure",
      title: `${topic} — page structure rewrite`,
      formatType: "landing_page_copy",
      keyword: topic,
      angleHint:
        `Restructure ${url} with exactly one H1, descriptive H2s, and an intro that names ` +
        "who the page is for and what they get.",
      reason: h1Issue.detail,
      relatedCheck: "H1 Tag",
      priority: "high",
    });
  }

  const h2Issue = byCheck.get("H2 Structure");
  if (h2Issue && h2Issue.status !== "pass") {
    push({
      id: "h2-depth",
      title: `Guide: ${topic}`,
      formatType: "guide",
      keyword: `how ${topic.toLowerCase()} works`.slice(0, 80),
      angleHint:
        `Expand thin copy into a guide with 5+ H2 sections, examples, and a short summary. ` +
        "Link back to the audited URL as the main service page.",
      reason: h2Issue.detail,
      relatedCheck: "H2 Structure",
      priority: "medium",
    });
  }

  const altIssue = byCheck.get("Image Alt Text");
  if (altIssue && altIssue.status !== "pass") {
    push({
      id: "image-alt",
      title: `${topic} — visual explainer`,
      formatType: "blog_post",
      keyword: `${topic} explained`.slice(0, 80),
      angleHint:
        "Blog post with annotated screenshots or diagrams. " +
        "Every image needs descriptive alt text.",
      reason: altIssue.detail,
      relatedCheck: "Image Alt Text",
      priority: "medium",
    });
  }

  const ogIssue = byCheck.get("Open Graph Tags");
  if (ogIssue && ogIssue.status !== "pass") {
    push({
      id: "open-graph",
      title: `${topic} — LinkedIn post + Open Graph`,
      formatType: "linkedin_post",
      keyword: topic,
      angleHint:
        `LinkedIn post on ${topic}: hook, three points, CTA. ` +
        "Reuse the hook as og:description on the audited page.",
      reason: ogIssue.detail,
      relatedCheck: "Open Graph Tags",
      priority: "medium",
    });
  }

  const twitterIssue = byCheck.get("Twitter Card Tags");
  if (twitterIssue && twitterIssue.status !== "pass") {
    push({
      id: "twitter-card",
      title: `${topic} — X thread`,
      formatType: "twitter_thread",
      keyword: topic,
      angleHint:
        `5–7 tweets on ${topic} with a clear opener. ` +
        "Add twitter:card meta on the landing page to match.",
      reason: twitterIssue.detail,
      relatedCheck: "Twitter Card Tags",
      priority: "medium",
    });
  }

  const canonicalIssue = byCheck.get("Canonical Tag");
  if (canonicalIssue && canonicalIssue.status !== "pass") {
    push({
      id: "canonical-hub",
      title: `${topic} — hub page`,
      formatType: "pillar_page",
      keyword: topic,
      angleHint:
        `Hub page for ${topic} with one canonical URL and links from related posts ` +
        "pointing at it.",
      reason: canonicalIssue.detail,
      relatedCheck: "Canonical Tag",
      priority: "medium",
    });
  }

  return recs.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export function contentStudioCreateParams(rec: GeoContentRecommendation): URLSearchParams {
  return new URLSearchParams({
    create: "1",
    format: rec.formatType,
    keyword: rec.keyword,
    title: rec.title,
    angle: rec.angleHint,
  });
}

export function contentStudioCreateHref(projectId: number, rec: GeoContentRecommendation): string {
  return `/projects/${projectId}/content-studio?${contentStudioCreateParams(rec).toString()}`;
}
