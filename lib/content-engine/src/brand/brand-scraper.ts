import { getAiProviderClient } from "@workspace/ai-providers/client";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import type { BrandExtract, Confidence } from "./brand-extract-types";
import { sanitizeBrandExtract, sanitizeProofAssets } from "./brand-extract-sanitize";
import { cleanAndParse } from "../core/utils";
import { logger } from "../core/logger";
import { assertAiGenerationEnabled } from "../support/publishing/platform-guard";
import {
  DEFAULT_BRAND_SCAN_MAX_DEPTH,
  DEFAULT_BRAND_SCAN_MAX_PAGES,
  discoverBrandScanUrls,
  normalizeBrandScanUrl,
  pickKeyPages,
  prioritizeDiscoveredUrls,
  type BrandScanDiscoveryInput,
  type BrandScanPlan,
} from "./brand-scan-discovery";
import { extractInternalLinks } from "./brand-scraper-links";
import { createRobotsGate } from "./robots-txt";
import { computeStyleVector } from "./style-vector";
import { evaluateStyleSufficiency } from "./style-sufficiency";

export type { BrandExtract, Confidence } from "./brand-extract-types";
export { extractInternalLinks } from "./brand-scraper-links";

export type ScrapeBrandProfileOptions = {
  scanPlan?: BrandScanPlan;
  discoveryInput?: Omit<BrandScanDiscoveryInput, "websiteUrl" | "homepageLinks">;
};

const SYSTEM_PROMPT = `You are an expert brand analyst. Given raw text scraped from a company's website, extract brand information and rate your confidence for each field. You MUST respond with a single valid JSON object and nothing else. No markdown code fences, no explanation — only raw JSON.`;

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; GoalsAC/1.0; +https://goals.ac)",
};

// Token robots.txt group matching looks for. Matches the product name in
// FETCH_HEADERS above without the version/URL suffix.
const ROBOTS_USER_AGENT = "GoalsAC";

// A page fetched during the crawl and the internal links found on it.
type CrawledPage = { url: string; html: string };

const CRAWL_CONCURRENCY = 5;

async function fetchPage(url: string): Promise<string | null> {
  try {
    await assertPublicUrl(url);
  } catch {
    return null;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: FETCH_HEADERS,
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

function stripHtml(html: string, maxChars = 8000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxChars);
}

/**
 * Same text extraction as stripHtml, but block structure survives as
 * newlines: paragraph breaks, list markers and heading lines. The style
 * vector measures paragraph shape, list use and heading density, and
 * stripHtml collapses all whitespace to single spaces, so measuring its
 * output reports every page as one unbroken paragraph with no lists and no
 * headings. Only the style vector reads this; the prompt text, the page
 * documents and the brand-voice index keep the stripHtml output they have
 * always had.
 */
export function stripHtmlStructured(html: string, maxChars = 8000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Headings and list items carry their markdown marker so the line scan
    // in computeStyleVector recognises them.
    .replace(/<h([1-6])[^>]*>/gi, (_match, level: string) => `\n\n${"#".repeat(Number(level))} `)
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|section|article|tr|blockquote|ul|ol|table)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    // Collapse runs of spaces and tabs, but keep line breaks. Three or more
    // blank lines read the same as one paragraph break.
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxChars);
}

/** Fetches a batch of URLs with bounded concurrency, skipping anything robots.txt disallows. */
async function fetchCrawlBatch(
  urls: string[],
  robotsGate: { isAllowed(url: string): Promise<boolean> },
): Promise<CrawledPage[]> {
  const pages: CrawledPage[] = [];
  for (let i = 0; i < urls.length; i += CRAWL_CONCURRENCY) {
    const chunk = urls.slice(i, i + CRAWL_CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (url): Promise<CrawledPage | null> => {
        const allowed = await robotsGate.isAllowed(url);
        if (!allowed) return null;
        const html = await fetchPage(url);
        if (!html) return null;
        return { url, html };
      }),
    );
    for (const result of results) {
      if (result) pages.push(result);
    }
  }
  return pages;
}

/**
 * Breadth-first crawl off the seed URLs (the homepage's one-hop links,
 * scored by discovery) up to `budget` pages and `maxDepth` hops. Never
 * revisits a normalized URL, never leaves the origin (extractInternalLinks
 * already filters same-origin), and skips anything robots.txt disallows.
 */
async function crawlSupplementalPages(
  origin: string,
  homepageNorm: string,
  seedUrls: string[],
  budget: number,
  maxDepth: number,
  robotsGate: { isAllowed(url: string): Promise<boolean> },
): Promise<CrawledPage[]> {
  const visited = new Set<string>([homepageNorm]);
  const fetched: CrawledPage[] = [];

  let frontier: string[] = [];
  for (const url of seedUrls) {
    const norm = normalizeBrandScanUrl(url);
    if (visited.has(norm)) continue;
    visited.add(norm);
    frontier.push(url);
  }

  let depth = 1;
  while (frontier.length > 0 && fetched.length < budget && depth <= maxDepth) {
    const remaining = budget - fetched.length;
    const batch = frontier.slice(0, remaining);
    const results = await fetchCrawlBatch(batch, robotsGate);
    fetched.push(...results);

    if (fetched.length >= budget || depth >= maxDepth) break;

    const nextCandidates: string[] = [];
    for (const page of results) {
      for (const link of extractInternalLinks(page.html, origin)) {
        const norm = normalizeBrandScanUrl(link);
        if (visited.has(norm)) continue;
        visited.add(norm);
        nextCandidates.push(link);
      }
    }
    frontier = prioritizeDiscoveredUrls(nextCandidates);
    depth += 1;
  }

  return fetched;
}

function extractWritingSamples(homepageText: string, pageTexts: string[]): string[] {
  const samples: string[] = [];
  const candidates = [homepageText, ...pageTexts].filter(Boolean);
  for (const text of candidates) {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 40 && s.length < 400);
    if (sentences.length > 0) {
      samples.push(sentences.slice(0, 2).join(" "));
    }
    if (samples.length >= 5) break;
  }
  return samples.slice(0, 5);
}

function buildSourcedPageText(
  pageDocuments: import("./brand-extract-types").BrandPageDocument[],
  maxChars: number,
): string {
  let out = "";
  for (const doc of pageDocuments) {
    if (!doc.text.trim()) continue;
    const chunk = `=== PAGE URL: ${doc.sourceUrl} ===\n${doc.text}\n\n`;
    if (out.length + chunk.length > maxChars) break;
    out += chunk;
  }
  return out;
}

async function analyzeBrandVoiceDeep(
  websiteUrl: string,
  allText: string,
  writingSamples: string[],
  scanSources: string[],
  pageDocuments: import("./brand-extract-types").BrandPageDocument[],
): Promise<BrandExtract["deep"]> {
  const ai = await getAiProviderClient();
  const sourcedText = buildSourcedPageText(pageDocuments, 10000);
  const prompt = `Analyze brand voice from website copy. URL: ${websiteUrl}

COPY:
${allText.slice(0, 10000)}

PAGES BY SOURCE URL (use this section, not COPY above, to find the "url" for any proof asset):
${sourcedText}

WRITING SAMPLES:
${writingSamples.join("\n---\n")}

Return ONLY valid JSON:
{
  "writingExamples": ["2-4 short verbatim excerpts from the site copy"],
  "doWords": ["words/phrases the brand favors"],
  "dontWords": ["words/phrases to avoid based on anti-patterns in industry"],
  "antiPatterns": ["writing habits this brand avoids"],
  "typicalStructure": "one sentence on how they structure pages/posts",
  "brandGlossary": ["product names, coined terms, preferred labels"],
  "productOfferings": ["main products or services"],
  "brandMemory": {
    "summary": "2-3 sentence brand positioning summary",
    "voiceTraits": ["3-5 voice adjectives"],
    "audienceInsights": ["2-4 audience insights"],
    "competitorPositioning": "how they differentiate vs competitors",
    "scanSources": ${JSON.stringify(scanSources)},
    "confidence": { "summary": "high|medium|low" },
    "proofAssets": [
      {
        "kind": "metric|case_study|customer_quote|named_example",
        "claim": "the exact number, result, or quote as it appears on the page",
        "source": "who or what the page attributes it to, if named",
        "url": "the page URL this came from"
      }
    ]
  }
}

PROOF ASSETS. Read this section carefully before filling "proofAssets":
Look through the supplied page text for concrete proof material the company itself has published: case study results, named metrics ("reduced churn by 22%"), named customers, testimonial quotes attributed to a person or company, and award or ranking claims.

Strict rules, because a fabricated proof asset is worse than none and will be presented to readers as a verified fact:
- Extract ONLY a claim that appears verbatim or near-verbatim in the supplied page text. Never infer it, never round a number, never generalize a specific result into a broader one, and never invent a plausible-sounding statistic, quote, or customer name.
- Every asset needs a "claim" copied from the text and, when the page provides it, the "url" of the page it came from and the "source" the page itself names (a customer, a report, a named team). Leave "source" out if the page does not name one. Do not guess an attribution.
- "kind" must be exactly one of: metric, case_study, customer_quote, named_example.
- If the supplied pages contain no such material, return "proofAssets": []. An empty array is the normal, correct result for most brochure-style sites. Do not stretch a vague marketing claim ("trusted by teams everywhere") into a manufactured proof asset just to produce output.`;

  const response = await ai.generate({
    prompt,
    systemInstruction: SYSTEM_PROMPT,
    temperature: 0.3,
    maxOutputTokens: 3072,
    thinkingBudget: 0,
    responseMimeType: "application/json",
  });

  const parsed = cleanAndParse<Record<string, unknown>>(response.text ?? "");
  const memory = (parsed.brandMemory ?? {}) as Record<string, unknown>;

  return {
    writingExamples: Array.isArray(parsed.writingExamples)
      ? parsed.writingExamples.map(String).slice(0, 5)
      : writingSamples,
    doWords: Array.isArray(parsed.doWords) ? parsed.doWords.map(String).slice(0, 12) : [],
    dontWords: Array.isArray(parsed.dontWords) ? parsed.dontWords.map(String).slice(0, 12) : [],
    antiPatterns: Array.isArray(parsed.antiPatterns) ? parsed.antiPatterns.map(String).slice(0, 8) : [],
    typicalStructure: String(parsed.typicalStructure ?? ""),
    brandGlossary: Array.isArray(parsed.brandGlossary) ? parsed.brandGlossary.map(String).slice(0, 15) : [],
    productOfferings: Array.isArray(parsed.productOfferings) ? parsed.productOfferings.map(String).slice(0, 10) : [],
    brandMemory: {
      summary: String(memory.summary ?? ""),
      voiceTraits: Array.isArray(memory.voiceTraits) ? memory.voiceTraits.map(String) : [],
      audienceInsights: Array.isArray(memory.audienceInsights) ? memory.audienceInsights.map(String) : [],
      competitorPositioning: String(memory.competitorPositioning ?? ""),
      scanSources,
      confidence:
        typeof memory.confidence === "object" && memory.confidence
          ? (memory.confidence as Record<string, Confidence>)
          : { summary: "medium" },
      proofAssets: sanitizeProofAssets(memory.proofAssets),
    },
  };
}

function parseConfidence(val: unknown): Confidence {
  if (val === "high" || val === "medium" || val === "low") return val;
  return "medium";
}

export async function scrapeBrandProfile(
  websiteUrl: string,
  options?: ScrapeBrandProfileOptions,
): Promise<BrandExtract> {
  await assertAiGenerationEnabled();
  const origin = new URL(websiteUrl).origin;
  // The customer supplied this URL themselves to be scanned, so the
  // homepage fetch always bypasses robots.txt. Only the supplemental
  // crawl below is gated.
  const homepageHtml = (await fetchPage(websiteUrl)) ?? "";

  const internalLinks = extractInternalLinks(homepageHtml, origin);

  const scanPlan =
    options?.scanPlan ??
    (options?.discoveryInput
      ? discoverBrandScanUrls({
          websiteUrl,
          homepageLinks: internalLinks,
          ...options.discoveryInput,
        })
      : undefined);

  const maxPages = scanPlan?.maxPages ?? options?.discoveryInput?.maxPages ?? DEFAULT_BRAND_SCAN_MAX_PAGES;
  const maxDepth = scanPlan?.maxDepth ?? options?.discoveryInput?.maxDepth ?? DEFAULT_BRAND_SCAN_MAX_DEPTH;
  const supplementalBudget = Math.max(0, maxPages - 1);

  const seedUrls = scanPlan?.pagesToFetch ?? pickKeyPages(internalLinks, supplementalBudget);

  const robotsGate = createRobotsGate(ROBOTS_USER_AGENT, fetchPage);
  const homepageNorm = normalizeBrandScanUrl(websiteUrl);

  const crawledPages = await crawlSupplementalPages(
    origin,
    homepageNorm,
    seedUrls,
    supplementalBudget,
    maxDepth,
    robotsGate,
  );

  const homepageText = stripHtml(homepageHtml);
  const cmsTexts = (scanPlan?.cmsExcerpts ?? []).map((entry) => entry.text);
  const crawledTexts = crawledPages.map((page) => stripHtml(page.html));

  const scannedPages = [...new Set([websiteUrl, ...crawledPages.map((page) => page.url)])];
  if (scanPlan?.scanSources) {
    for (const url of scanPlan.scanSources) {
      const norm = normalizeBrandScanUrl(url);
      if (!scannedPages.some((existing) => normalizeBrandScanUrl(existing) === norm)) {
        scannedPages.push(url);
      }
    }
  }

  const pageDocuments: import("./brand-extract-types").BrandPageDocument[] = [
    { sourceUrl: websiteUrl, text: homepageText, sourceType: "website" },
    ...crawledPages
      .map((page, index) => ({
        sourceUrl: page.url,
        text: crawledTexts[index] ?? "",
        sourceType: "website" as const,
      }))
      .filter((doc) => doc.text.trim().length > 100),
    ...(scanPlan?.cmsExcerpts ?? []).map((entry) => ({
      sourceUrl: entry.url,
      title: entry.title,
      text: entry.text,
      sourceType: "cms" as const,
    })),
  ];

  const writingSamples = extractWritingSamples(homepageText, [...crawledTexts, ...cmsTexts]);

  const allText = [homepageText, ...crawledTexts, ...cmsTexts]
    .join("\n\n---\n\n")
    .slice(0, 12000);

  // Measured from structure-preserving text: the same pages, read with their
  // paragraph, list and heading breaks intact. CMS excerpts are markdown and
  // already carry their own line breaks.
  const styleVector = computeStyleVector([
    { text: stripHtmlStructured(homepageHtml) },
    ...crawledPages.map((page) => ({ text: stripHtmlStructured(page.html) })),
    ...(scanPlan?.cmsExcerpts ?? []).map((entry) => ({ text: entry.text, title: entry.title })),
  ]);

  const ai = await getAiProviderClient();

  const prompt = `Analyze this website text and extract brand information. Write like a sharp analyst — not a marketing brochure. The website URL is: ${websiteUrl}

WEBSITE TEXT:
${allText}

Return ONLY valid JSON matching this schema (no markdown, no comments):

{
  "companyName": "string",
  "companyNameConfidence": "high|medium|low",
  "industry": "string",
  "industryConfidence": "high|medium|low",
  "targetAudience": "string",
  "targetAudienceConfidence": "high|medium|low",
  "voiceTone": "string",
  "voiceToneConfidence": "high|medium|low",
  "primaryKeywords": ["string"],
  "primaryKeywordsConfidence": "high|medium|low",
  "competitorUrls": ["string"],
  "competitorUrlsConfidence": "high|medium|low"
}

Field rules:
- companyName: Legal/brand name from the site — not a tagline or hero headline
- industry: One short label, max 80 chars (e.g. "B2B SaaS for HR teams"). No parenthetical clauses
- targetAudience: 1–2 plain sentences naming roles, company size, and pain points found in the copy. No filler like "seeking solutions" or "end-to-end"
- voiceTone: One sentence, max 120 chars. Describe how the site actually reads (sentence length, formality). No stacked adjectives
- primaryKeywords: 3–6 terms the site repeats or emphasizes — not generic SEO words
- competitorUrls: ONLY real competitor URLs explicitly linked or named on the site. If none found, return []. NEVER invent or use placeholder URLs like competitor1.com or example.com

Confidence rules — be conservative:
- "high" only when the value is explicitly stated in the text
- "medium" when reasonably inferred from multiple signals
- "low" when guessing or signal is weak
- competitorUrls should almost always be "low" unless a real URL appears in the text

Banned in all string fields: placeholder URLs, example.com, "competitor1", buzzwords (synergy, leverage, cutting-edge, world-class, outcome-focused, results-oriented, seamless, robust, holistic, transformative, game-changer)`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await ai.generate({
        prompt,
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
        maxOutputTokens: 2048,
        thinkingBudget: 0,
        responseMimeType: "application/json",
      });

      const parsed = cleanAndParse<Record<string, unknown>>(response.text ?? "");

      if (!parsed.companyName || !parsed.industry) {
        throw new Error("Incomplete brand extract");
      }

      const voiceToneConfidence = parseConfidence(parsed.voiceToneConfidence);
      const styleSufficiency = evaluateStyleSufficiency({
        pageDocuments: pageDocuments.map((doc) => ({ text: doc.text })),
        voiceToneConfidence,
      });

      return sanitizeBrandExtract({
        companyName: String(parsed.companyName || ""),
        industry: String(parsed.industry || ""),
        targetAudience: String(parsed.targetAudience || ""),
        voiceTone: String(parsed.voiceTone || ""),
        primaryKeywords: Array.isArray(parsed.primaryKeywords) ? parsed.primaryKeywords.map(String) : [],
        competitorUrls: Array.isArray(parsed.competitorUrls) ? parsed.competitorUrls.map(String).filter(Boolean) : [],
        confidence: {
          companyName: parseConfidence(parsed.companyNameConfidence),
          industry: parseConfidence(parsed.industryConfidence),
          targetAudience: parseConfidence(parsed.targetAudienceConfidence),
          voiceTone: voiceToneConfidence,
          primaryKeywords: parseConfidence(parsed.primaryKeywordsConfidence),
          competitorUrls: parseConfidence(parsed.competitorUrlsConfidence),
        },
        scannedPages,
        pageDocuments,
        discoveryMeta: scanPlan?.discoveryMeta,
        styleVector,
        styleSufficiency,
        deep: await analyzeBrandVoiceDeep(websiteUrl, allText, writingSamples, scannedPages, pageDocuments),
      });
    } catch (err) {
      logger.warn({ err, attempt }, "Brand scrape parse error");
      if (attempt === 2) throw err;
    }
  }

  throw new Error("Failed to extract brand profile after retries");
}
