/**
 * Site-audit issue registry.
 *
 * Adapted from OpenSEO (MIT) src/shared/audit-issues.ts — howToFix copy
 * and severity model; user-agent references renamed for GoalsAc-Audit.
 */

export type IssueSeverity = "critical" | "warning" | "info";

export type AuditIssueDescriptor = {
  severity: IssueSeverity;
  title: string;
  explanation: string;
  howToFix: string;
};

export const AUDIT_ISSUE_TYPES = {
  "blocked-page": {
    severity: "critical",
    title: "Crawler was blocked",
    explanation:
      "The site returned a bot challenge or access denial (e.g. a Cloudflare challenge, 403, or 429) instead of the page. We report this honestly rather than pretending the page is broken — but it means this page could not be audited, and other crawlers like search engines may face similar friction.",
    howToFix:
      'If you own this site, allowlist the "GoalsAc-Audit" user agent in your WAF/bot-protection settings (on Cloudflare: a WAF custom rule that skips bot protection when the user agent contains "GoalsAc-Audit"). Then re-run the audit.',
  },
  "server-error": {
    severity: "critical",
    title: "Server error (5xx)",
    explanation:
      "The page returned a 5xx server error. Search engines that repeatedly see server errors will crawl the site less and may drop the page from the index.",
    howToFix:
      "Check the server logs for this URL and fix the underlying error. If the page is gone, return a 404/410 or redirect it to a relevant page instead of erroring.",
  },
  "broken-internal-link": {
    severity: "critical",
    title: "Broken internal link",
    explanation:
      "This page links to an internal URL that returns an error status (4xx/5xx). Broken links waste crawl budget, leak link equity, and frustrate users.",
    howToFix:
      "Update the link to point at the correct live URL, or remove it. If the target was moved, prefer linking directly to the new URL rather than relying on a redirect.",
  },
  "missing-title": {
    severity: "critical",
    title: "Missing title tag",
    explanation:
      "The page has no <title>. The title is the strongest on-page relevance signal and the headline shown in search results; without it search engines generate one themselves, usually badly.",
    howToFix:
      "Add a unique, descriptive <title> of roughly 50–60 characters that includes the page's primary topic.",
  },
  "broken-page": {
    severity: "warning",
    title: "Page returns an error (4xx)",
    explanation:
      "This crawled URL returned a client error (e.g. 404). If it is referenced from your sitemap or other pages, crawlers keep wasting requests on it.",
    howToFix:
      "If the page should exist, restore it. If it is intentionally gone, remove it from the sitemap and internal links, and consider a 301 redirect to the closest live page.",
  },
  "duplicate-title": {
    severity: "warning",
    title: "Duplicate title",
    explanation:
      "Multiple pages share the same title tag. Search engines use titles to differentiate pages; duplicates make pages compete with each other and depress click-through rates.",
    howToFix:
      "Write a unique title for each page describing its specific content.",
  },
  "duplicate-meta-description": {
    severity: "warning",
    title: "Duplicate meta description",
    explanation:
      "Multiple pages share the same meta description, so search results show identical snippets and users cannot tell the pages apart.",
    howToFix:
      "Write a unique meta description per page, or remove the duplicated one entirely.",
  },
  "duplicate-content": {
    severity: "warning",
    title: "Duplicate page content",
    explanation:
      "Two or more URLs serve byte-identical visible text. Search engines pick one version to index and ignore the rest.",
    howToFix:
      "Consolidate duplicates: pick the canonical URL, add rel=canonical from the others, and 301-redirect duplicate URLs where possible.",
  },
  "missing-meta-description": {
    severity: "warning",
    title: "Missing meta description",
    explanation:
      "The page has no meta description. Search engines will assemble a snippet from page text, which is often less compelling.",
    howToFix:
      "Add a meta description of roughly 70–160 characters that summarizes the page and gives a reason to click.",
  },
  "missing-h1": {
    severity: "warning",
    title: "Missing H1 heading",
    explanation:
      "The page has no H1. The H1 tells users and search engines what the page is about.",
    howToFix:
      "Add a single H1 that states the page's main topic, consistent with the title tag.",
  },
  "multiple-h1": {
    severity: "warning",
    title: "Multiple H1 headings",
    explanation:
      "The page has more than one H1, which dilutes the main-topic signal and usually indicates a templating mistake.",
    howToFix:
      "Keep one H1 for the page's main heading and demote the others to H2/H3.",
  },
  "redirect-chain": {
    severity: "warning",
    title: "Redirect chain",
    explanation:
      "Reaching the final page requires two or more consecutive redirects. Each hop adds latency and burns crawl budget.",
    howToFix:
      "Point the first URL (and any internal links) directly at the final destination so there is at most one redirect.",
  },
  "redirect-loop": {
    severity: "warning",
    title: "Redirect loop",
    explanation:
      "This redirect eventually points back to itself, so the URL never resolves.",
    howToFix:
      "Trace the redirect rules for this URL and break the cycle so the chain terminates at a real 200 page.",
  },
  "canonical-conflict": {
    severity: "warning",
    title: "Conflicting canonical signals",
    explanation:
      "The page declares different canonical URLs in its HTML <link rel=canonical> and its HTTP Link header.",
    howToFix:
      "Pick one canonical URL and declare it in exactly one place; remove or align the other declaration.",
  },
  "thin-content": {
    severity: "warning",
    title: "Thin content",
    explanation:
      "The page has very little visible text. Thin pages rarely rank and can drag down sitewide quality assessments.",
    howToFix:
      "Either expand the page with useful content, noindex it, or consolidate it into a stronger page.",
  },
  "images-missing-alt": {
    severity: "warning",
    title: "Images missing alt text",
    explanation:
      "One or more images on the page lack alt attributes. Alt text is an accessibility requirement and how search engines understand images.",
    howToFix:
      'Add descriptive alt text to meaningful images; use an empty alt (alt="") only for purely decorative ones.',
  },
  "orphan-page": {
    severity: "warning",
    title: "Orphan page",
    explanation:
      "No crawled page links to this URL — it was only discoverable via the sitemap. Pages without internal links receive little crawl attention.",
    howToFix:
      "Link to this page from relevant pages, or remove it from the sitemap if it should not be indexed.",
  },
  "no-outgoing-links": {
    severity: "warning",
    title: "Page has no outgoing links",
    explanation:
      "The page contains no links at all — a dead end for crawlers and users.",
    howToFix:
      "Add links to related pages, the parent category, or the homepage.",
  },
  "title-too-long": {
    severity: "info",
    title: "Title too long",
    explanation:
      "The title exceeds ~60 characters, so search results will truncate it.",
    howToFix:
      "Shorten the title to roughly 50–60 characters, front-loading the most important words.",
  },
  "title-too-short": {
    severity: "info",
    title: "Title too short",
    explanation:
      "The title is under ~10 characters, which is usually too generic.",
    howToFix:
      "Expand the title into a descriptive phrase (roughly 30–60 characters).",
  },
  "meta-description-too-long": {
    severity: "info",
    title: "Meta description too long",
    explanation:
      "The meta description exceeds ~160 characters, so search engines will truncate the snippet.",
    howToFix:
      "Trim the description to roughly 70–160 characters.",
  },
  "meta-description-too-short": {
    severity: "info",
    title: "Meta description too short",
    explanation:
      "The meta description is under ~70 characters.",
    howToFix:
      "Expand the description to roughly 70–160 characters.",
  },
  "heading-order-skip": {
    severity: "info",
    title: "Heading levels skip",
    explanation:
      "The heading hierarchy skips levels (e.g. an H4 directly after an H2).",
    howToFix:
      "Adjust heading levels so they descend one step at a time without skipping.",
  },
  "slow-response": {
    severity: "info",
    title: "Slow server response",
    explanation:
      "The HTML response took over 1.5 seconds. Slow TTFB reduces crawl rate on large sites.",
    howToFix:
      "Investigate server/database time and caching for this route.",
  },
  "noindex-page": {
    severity: "info",
    title: "Page is noindex",
    explanation:
      "The page asks search engines not to index it (via robots meta or X-Robots-Tag). Often intentional.",
    howToFix:
      "If this page should rank, remove the noindex directive. If intentional, no action is needed.",
  },
  "canonicalized-page": {
    severity: "info",
    title: "Canonicalized to another URL",
    explanation:
      "The page declares a different URL as its canonical.",
    howToFix:
      "If this page should rank on its own, set its canonical to itself. Otherwise no action is needed.",
  },
  "deep-page": {
    severity: "info",
    title: "Page is deep in the site structure",
    explanation:
      "The page is 5+ clicks from the homepage. Deep pages get crawled less often.",
    howToFix:
      "Add links from higher-level pages to flatten the path to this page.",
  },
} as const satisfies Record<string, AuditIssueDescriptor>;

export type AuditIssueType = keyof typeof AUDIT_ISSUE_TYPES;

export const ISSUE_SEVERITY_ORDER: Record<IssueSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function getIssueDescriptor(issueType: string): AuditIssueDescriptor | null {
  return (AUDIT_ISSUE_TYPES as Record<string, AuditIssueDescriptor>)[issueType] ?? null;
}

export const AUDIT_USER_AGENT =
  "Mozilla/5.0 (compatible; GoalsAc-Audit/1.0; +https://goals.ac)";
