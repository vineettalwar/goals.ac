import { parse, type HTMLElement } from "node-html-parser";
import type { GeoIssue } from "@workspace/db";
import { originOf } from "./free-tools/origin";
import { parseRobotsTxt } from "./free-tools/robots";
import { fetchPublicText } from "./safe-fetch";

export const AI_CRAWLERS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"] as const;

export type AuditResult = {
  url: string;
  geoScore: number;
  issues: GeoIssue[];
  pageTitle: string | null;
  metaDescription: string | null;
  hasSchemaOrg: boolean;
  schemaTypes: string[];
  h1Count: number;
  h1Text: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  imageCount: number;
  imagesMissingAlt: number;
};

async function fetchOptionalText(url: string): Promise<string | null> {
  try {
    return await fetchPublicText(url, {
      timeoutMs: 6000,
      accept: "text/plain,*/*;q=0.8",
    });
  } catch {
    return null;
  }
}

export function issueForLlmsTxt(body: string | null): GeoIssue {
  const trimmed = body?.trim() ?? "";
  if (trimmed.length >= 20) {
    return {
      check: "llms.txt",
      status: "pass",
      detail: `Found llms.txt (${trimmed.length} characters).`,
      fix: "",
    };
  }
  if (trimmed.length > 0) {
    return {
      check: "llms.txt",
      status: "warn",
      detail: "llms.txt exists but is too short to describe the site to AI crawlers.",
      fix: "Publish a llms.txt at the site origin with a short description and links to canonical docs.",
    };
  }
  return {
    check: "llms.txt",
    status: "warn",
    detail: "No llms.txt at the site origin.",
    fix: "Add https://your-origin/llms.txt so AI crawlers can read an official site summary.",
  };
}

export function issueForAiRobots(robotsText: string | null): GeoIssue {
  if (!robotsText?.trim()) {
    return {
      check: "AI crawler robots",
      status: "warn",
      detail: "robots.txt was missing or empty, so AI crawler access could not be verified.",
      fix: "Publish robots.txt and allow GPTBot, ClaudeBot, PerplexityBot, and Google-Extended unless you intend to block them.",
    };
  }
  const parsed = parseRobotsTxt(robotsText, "https://example.com/robots.txt");
  const blocked = AI_CRAWLERS.filter((bot) => {
    const group = parsed.agents.find((a) =>
      a.userAgents.some((ua) => ua.toLowerCase() === bot.toLowerCase()),
    );
    if (!group) return false;
    return group.blocksAll || group.disallows.includes("/") || group.disallows.includes("/*");
  });
  if (blocked.length > 0) {
    return {
      check: "AI crawler robots",
      status: "warn",
      detail: `${blocked.join(", ")} ${blocked.length === 1 ? "is" : "are"} disallowed in robots.txt.`,
      fix: "Allow those user-agents if you want the pages cited in AI answers.",
    };
  }
  return {
    check: "AI crawler robots",
    status: "pass",
    detail: "No named AI crawler is blocked site-wide in robots.txt.",
    fix: "",
  };
}

function walkJsonLd(
  node: unknown,
  acc: { sameAs: string[]; dateModified: string[]; hasPerson: boolean },
): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const entry of node) walkJsonLd(entry, acc);
    return;
  }
  const record = node as Record<string, unknown>;
  const typeValue = record["@type"];
  const types = Array.isArray(typeValue)
    ? typeValue.filter((t): t is string => typeof t === "string")
    : typeof typeValue === "string"
      ? [typeValue]
      : [];
  if (types.some((t) => t.toLowerCase() === "person")) acc.hasPerson = true;
  const sameAs = record.sameAs;
  if (typeof sameAs === "string") acc.sameAs.push(sameAs);
  else if (Array.isArray(sameAs)) {
    for (const entry of sameAs) {
      if (typeof entry === "string") acc.sameAs.push(entry);
    }
  }
  if (typeof record.dateModified === "string") acc.dateModified.push(record.dateModified);
  if (typeof record.datePublished === "string") acc.dateModified.push(record.datePublished);
  if (Array.isArray(record["@graph"])) {
    for (const entry of record["@graph"]) walkJsonLd(entry, acc);
  }
}

export function geoCitationIssues(html: string, pageUrl: string): GeoIssue[] {
  const root = parse(html);
  const acc = { sameAs: [] as string[], dateModified: [] as string[], hasPerson: false };
  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      walkJsonLd(JSON.parse(script.text), acc);
    } catch {
      // ignore invalid JSON-LD
    }
  }

  const authorMeta =
    root.querySelector('meta[name="author"]')?.getAttribute("content")?.trim() ||
    root.querySelector('meta[property="article:author"]')?.getAttribute("content")?.trim() ||
    root.querySelector('[rel="author"]')?.text?.trim() ||
    null;
  const modifiedMeta =
    root.querySelector('meta[property="article:modified_time"]')?.getAttribute("content")?.trim() ||
    root.querySelector("time[datetime]")?.getAttribute("datetime")?.trim() ||
    null;

  let origin: string;
  try {
    origin = new URL(pageUrl).origin;
  } catch {
    origin = "";
  }
  let outbound = 0;
  for (const a of root.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href") ?? "";
    if (!/^https?:/i.test(href)) continue;
    try {
      if (new URL(href).origin !== origin) outbound += 1;
    } catch {
      // skip
    }
  }

  const body = (root.querySelector("body") ?? root) as HTMLElement;
  const wordCount = body.text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;

  const issues: GeoIssue[] = [];
  if (acc.sameAs.length > 0) {
    issues.push({
      check: "Entity sameAs",
      status: "pass",
      detail: `JSON-LD sameAs has ${acc.sameAs.length} profile link(s).`,
      fix: "",
    });
  } else {
    issues.push({
      check: "Entity sameAs",
      status: "warn",
      detail: "Organization/WebSite JSON-LD has no sameAs profiles.",
      fix: "Add sameAs URLs (LinkedIn, Wikipedia, Crunchbase) on Organization schema.",
    });
  }

  if (acc.hasPerson || authorMeta) {
    issues.push({
      check: "Author / Person",
      status: "pass",
      detail: acc.hasPerson ? "Person schema found." : `Author meta: ${authorMeta}.`,
      fix: "",
    });
  } else {
    issues.push({
      check: "Author / Person",
      status: "warn",
      detail: "No Person schema or author byline for this page.",
      fix: "Add Person/author markup so AI engines can attribute the page.",
    });
  }

  const modified = acc.dateModified[0] ?? modifiedMeta;
  if (modified) {
    issues.push({
      check: "Freshness dates",
      status: "pass",
      detail: `Found dateModified/published: ${modified}.`,
      fix: "",
    });
  } else {
    issues.push({
      check: "Freshness dates",
      status: "warn",
      detail: "No dateModified or article modified time on this page.",
      fix: "Expose dateModified in JSON-LD or article:modified_time.",
    });
  }

  if (outbound >= 2) {
    issues.push({
      check: "Outbound citations",
      status: "pass",
      detail: `${outbound} off-site https links on this page.`,
      fix: "",
    });
  } else {
    issues.push({
      check: "Outbound citations",
      status: "warn",
      detail: outbound === 0 ? "No outbound https citations on this page." : "Only one outbound citation on this page.",
      fix: "Link to primary sources so AI engines can verify claims.",
    });
  }

  if (wordCount >= 300) {
    issues.push({
      check: "Citability length",
      status: "pass",
      detail: `About ${wordCount} words on this page.`,
      fix: "",
    });
  } else {
    issues.push({
      check: "Citability length",
      status: "warn",
      detail: `About ${wordCount} words — thin for citation in AI answers.`,
      fix: "Expand the page with answer-first sections (still this URL, not a full-site crawl).",
    });
  }

  return issues;
}

export async function auditUrl(url: string): Promise<AuditResult> {
  const html = await fetchPublicText(url);
  const root = parse(html);
  const issues: GeoIssue[] = [];

  const titleEl = root.querySelector("title");
  const pageTitle = titleEl?.text?.trim() || null;
  const titleLen = pageTitle?.length ?? 0;
  if (!pageTitle) {
    issues.push({
      check: "Page Title",
      status: "fail",
      detail: "No page title found.",
      fix: "Add a <title> tag inside <head> with a concise, descriptive title.",
    });
  } else if (titleLen < 30 || titleLen > 60) {
    issues.push({
      check: "Page Title",
      status: "warn",
      detail: `Title is ${titleLen} characters (ideal: 30–60).`,
      fix: `Adjust title to be between 30–60 characters. Current: "${pageTitle.slice(0, 80)}"`,
    });
  } else {
    issues.push({
      check: "Page Title",
      status: "pass",
      detail: `Title is ${titleLen} characters.`,
      fix: "",
    });
  }

  const metaDescEl = root.querySelector('meta[name="description"]');
  const metaDescription = metaDescEl?.getAttribute("content")?.trim() || null;
  const metaLen = metaDescription?.length ?? 0;
  if (!metaDescription) {
    issues.push({
      check: "Meta Description",
      status: "fail",
      detail: "No meta description found.",
      fix: 'Add <meta name="description" content="..."> with 50–160 characters.',
    });
  } else if (metaLen < 50 || metaLen > 160) {
    issues.push({
      check: "Meta Description",
      status: "fail",
      detail: `Meta description is ${metaLen} characters (ideal: 50–160).`,
      fix: "Rewrite the meta description to be between 50–160 characters.",
    });
  } else {
    issues.push({
      check: "Meta Description",
      status: "pass",
      detail: `Meta description is ${metaLen} characters.`,
      fix: "",
    });
  }

  const schemaScripts = root.querySelectorAll('script[type="application/ld+json"]');
  const hasSchemaOrg = schemaScripts.length > 0;
  const schemaTypes: string[] = [];

  function collectSchemaTypes(node: unknown): void {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      for (const entry of node) collectSchemaTypes(entry);
      return;
    }

    const record = node as Record<string, unknown>;
    const typeValue = record["@type"];
    if (typeof typeValue === "string") {
      schemaTypes.push(typeValue);
    } else if (Array.isArray(typeValue)) {
      for (const entry of typeValue) {
        if (typeof entry === "string") schemaTypes.push(entry);
      }
    }

    const graph = record["@graph"];
    if (Array.isArray(graph)) {
      for (const entry of graph) collectSchemaTypes(entry);
    }
  }

  for (const script of schemaScripts) {
    try {
      collectSchemaTypes(JSON.parse(script.text));
    } catch {
      // ignore invalid JSON
    }
  }

  if (!hasSchemaOrg) {
    issues.push({
      check: "Schema.org Markup",
      status: "fail",
      detail: "No JSON-LD structured data found.",
      fix: 'Add <script type="application/ld+json"> with relevant schema types (Organization, WebSite, etc.).',
    });
  } else {
    issues.push({
      check: "Schema.org Markup",
      status: "pass",
      detail: `Found ${schemaScripts.length} JSON-LD block(s): ${schemaTypes.join(", ") || "unknown types"}.`,
      fix: "",
    });
  }

  const hasFaqSchema = schemaTypes.some((type) => type.toLowerCase().includes("faq"));
  if (!hasFaqSchema) {
    issues.push({
      check: "FAQ Schema",
      status: hasSchemaOrg ? "warn" : "fail",
      detail: hasSchemaOrg
        ? "Structured data found, but no FAQPage schema."
        : "No FAQPage schema for AI-friendly Q&A snippets.",
      fix: "Publish an FAQ section or article with FAQPage JSON-LD so AI engines can cite direct answers.",
    });
  } else {
    issues.push({
      check: "FAQ Schema",
      status: "pass",
      detail: "FAQPage schema detected.",
      fix: "",
    });
  }

  const h1Tags = root.querySelectorAll("h1");
  const h1Count = h1Tags.length;
  const h1Text = h1Tags[0]?.text?.trim() || null;
  if (h1Count === 0) {
    issues.push({
      check: "H1 Tag",
      status: "fail",
      detail: "No H1 tag found.",
      fix: "Add exactly one <h1> tag containing your primary keyword and page topic.",
    });
  } else if (h1Count > 1) {
    issues.push({
      check: "H1 Tag",
      status: "fail",
      detail: `Found ${h1Count} H1 tags (exactly one is required).`,
      fix: "Keep exactly one <h1> per page. Demote extras to <h2> or lower.",
    });
  } else {
    issues.push({
      check: "H1 Tag",
      status: "pass",
      detail: "Exactly one H1 tag found.",
      fix: "",
    });
  }

  const h2Tags = root.querySelectorAll("h2");
  const h2Count = h2Tags.length;
  if (h2Count < 3) {
    issues.push({
      check: "H2 Structure",
      status: "warn",
      detail: `Only ${h2Count} H2 tag(s) found (3+ recommended for AI-readable structure).`,
      fix: "Break content into sections with descriptive H2 headings to improve AI parsing.",
    });
  } else {
    issues.push({
      check: "H2 Structure",
      status: "pass",
      detail: `${h2Count} H2 tags found.`,
      fix: "",
    });
  }

  const images = root.querySelectorAll("img");
  const imageCount = images.length;
  const imagesMissingAlt = images.filter((img) => {
    const alt = img.getAttribute("alt");
    return alt === null || alt === undefined;
  }).length;

  if (imageCount > 0 && imagesMissingAlt > 0) {
    issues.push({
      check: "Image Alt Text",
      status: "fail",
      detail: `${imagesMissingAlt} of ${imageCount} image(s) missing alt attributes.`,
      fix: 'Add descriptive alt="..." attributes to all <img> tags for accessibility and AI indexing.',
    });
  } else {
    issues.push({
      check: "Image Alt Text",
      status: "pass",
      detail: imageCount === 0 ? "No images found." : `All ${imageCount} image(s) have alt text.`,
      fix: "",
    });
  }

  const canonicalEl = root.querySelector('link[rel="canonical"]');
  if (!canonicalEl) {
    issues.push({
      check: "Canonical Tag",
      status: "warn",
      detail: "No canonical tag found.",
      fix: 'Add <link rel="canonical" href="https://yourdomain.com/page"> to prevent duplicate content issues.',
    });
  } else {
    issues.push({
      check: "Canonical Tag",
      status: "pass",
      detail: `Canonical URL: ${canonicalEl.getAttribute("href") || "present"}`,
      fix: "",
    });
  }

  const ogTitle = root.querySelector('meta[property="og:title"]');
  const ogDescription = root.querySelector('meta[property="og:description"]');
  if (!ogTitle || !ogDescription) {
    const missing = [!ogTitle && "og:title", !ogDescription && "og:description"].filter(Boolean).join(", ");
    issues.push({
      check: "Open Graph Tags",
      status: "warn",
      detail: `Missing Open Graph tags: ${missing}.`,
      fix: "Add og:title and og:description meta tags for better social sharing and AI context.",
    });
  } else {
    issues.push({
      check: "Open Graph Tags",
      status: "pass",
      detail: "og:title and og:description are present.",
      fix: "",
    });
  }

  const twitterCard = root.querySelector('meta[name="twitter:card"]');
  if (!twitterCard) {
    issues.push({
      check: "Twitter Card Tags",
      status: "warn",
      detail: "No twitter:card meta tag found.",
      fix: 'Add <meta name="twitter:card" content="summary_large_image"> for Twitter/X sharing previews.',
    });
  } else {
    issues.push({
      check: "Twitter Card Tags",
      status: "pass",
      detail: `twitter:card = "${twitterCard.getAttribute("content") || "present"}"`,
      fix: "",
    });
  }

  const isHttps = url.startsWith("https://");
  if (!isHttps) {
    issues.push({
      check: "HTTPS",
      status: "fail",
      detail: "Page is served over HTTP, not HTTPS.",
      fix: "Migrate to HTTPS with an SSL certificate. AI engines de-prioritize non-secure pages.",
    });
  } else {
    issues.push({
      check: "HTTPS",
      status: "pass",
      detail: "Page is served over HTTPS.",
      fix: "",
    });
  }

  const origin = originOf(url);
  const [llmsTxt, robotsTxt] = await Promise.all([
    fetchOptionalText(`${origin}/llms.txt`),
    fetchOptionalText(`${origin}/robots.txt`),
  ]);
  issues.push(issueForLlmsTxt(llmsTxt));
  issues.push(issueForAiRobots(robotsTxt));
  issues.push(...geoCitationIssues(html, url));

  const failCount = issues.filter((i) => i.status === "fail").length;
  const warnCount = issues.filter((i) => i.status === "warn").length;
  const geoScore = Math.max(0, Math.min(100, 100 - failCount * 12 - warnCount * 5));

  return {
    url,
    geoScore,
    issues,
    pageTitle,
    metaDescription,
    hasSchemaOrg,
    schemaTypes,
    h1Count,
    h1Text,
    ogTitle: ogTitle?.getAttribute("content")?.trim() || null,
    ogDescription: ogDescription?.getAttribute("content")?.trim() || null,
    imageCount,
    imagesMissingAlt,
  };
}
