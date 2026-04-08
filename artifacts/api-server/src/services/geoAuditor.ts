import { parse } from "node-html-parser";
import type { GeoIssue } from "@workspace/db";

export type AuditResult = {
  url: string;
  geoScore: number;
  issues: GeoIssue[];
  pageTitle: string | null;
  metaDescription: string | null;
  hasSchemaOrg: boolean;
  schemaTypes: string[];
  h1Count: number;
  imageCount: number;
  imagesMissingAlt: number;
};

export async function auditUrl(url: string): Promise<AuditResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let html: string;
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GEO-Auditor/1.0)",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    html = await response.text();
  } finally {
    clearTimeout(timeout);
  }

  const root = parse(html);
  const issues: GeoIssue[] = [];

  // 1. Page Title
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

  // 2. Meta Description
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
      fix: `Rewrite the meta description to be between 50–160 characters.`,
    });
  } else {
    issues.push({
      check: "Meta Description",
      status: "pass",
      detail: `Meta description is ${metaLen} characters.`,
      fix: "",
    });
  }

  // 3. Schema.org Markup
  const schemaScripts = root.querySelectorAll('script[type="application/ld+json"]');
  const hasSchemaOrg = schemaScripts.length > 0;
  const schemaTypes: string[] = [];

  for (const script of schemaScripts) {
    try {
      const data = JSON.parse(script.text);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"]) schemaTypes.push(item["@type"]);
      }
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

  // 4. H1 Tag
  const h1Tags = root.querySelectorAll("h1");
  const h1Count = h1Tags.length;
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

  // 5. H2 Structure
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

  // 6. Image Alt Text
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

  // 7. Canonical Tag
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

  // 8. Open Graph Tags
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

  // 9. Twitter Card Tags
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

  // 10. HTTPS
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

  // Calculate GEO score
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
    imageCount,
    imagesMissingAlt,
  };
}
