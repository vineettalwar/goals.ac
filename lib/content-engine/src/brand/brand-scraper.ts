import { getAiProviderClient } from "@workspace/ai-providers/client";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import type { BrandExtract, Confidence } from "./brand-extract-types";
import { sanitizeBrandExtract } from "./brand-extract-sanitize";
import { cleanAndParse } from "../core/utils";
import { logger } from "../core/logger";
import { assertAiGenerationEnabled } from "../support/publishing/platform-guard";
import {
  discoverBrandScanUrls,
  pickKeyPages,
  type BrandScanDiscoveryInput,
  type BrandScanPlan,
} from "./brand-scan-discovery";
import { extractInternalLinks } from "./brand-scraper-links";

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

async function fetchPageText(url: string, maxChars = 8000): Promise<string | null> {
  const html = await fetchPage(url);
  return html ? stripHtml(html, maxChars) : null;
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

async function analyzeBrandVoiceDeep(
  websiteUrl: string,
  allText: string,
  writingSamples: string[],
  scanSources: string[],
): Promise<BrandExtract["deep"]> {
  const ai = await getAiProviderClient();
  const prompt = `Analyze brand voice from website copy. URL: ${websiteUrl}

COPY:
${allText.slice(0, 10000)}

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
    "confidence": { "summary": "high|medium|low" }
  }
}`;

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

  const extraPages = scanPlan?.pagesToFetch ?? pickKeyPages(internalLinks);
  const scannedPages = scanPlan?.scanSources ?? [websiteUrl, ...extraPages];

  const extraTexts = await Promise.all(extraPages.map((url) => fetchPageText(url)));
  const homepageText = stripHtml(homepageHtml);
  const cmsTexts = (scanPlan?.cmsExcerpts ?? []).map((entry) => entry.text);
  const fetchedTexts = extraTexts.filter(Boolean) as string[];

  const pageDocuments: import("./brand-extract-types").BrandPageDocument[] = [
    { sourceUrl: websiteUrl, text: homepageText, sourceType: "website" },
    ...extraPages
      .map((url, index) => ({
        sourceUrl: url,
        text: extraTexts[index] ?? "",
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

  const writingSamples = extractWritingSamples(homepageText, [...fetchedTexts, ...cmsTexts]);

  const allText = [homepageText, ...fetchedTexts, ...cmsTexts]
    .join("\n\n---\n\n")
    .slice(0, 12000);

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
          voiceTone: parseConfidence(parsed.voiceToneConfidence),
          primaryKeywords: parseConfidence(parsed.primaryKeywordsConfidence),
          competitorUrls: parseConfidence(parsed.competitorUrlsConfidence),
        },
        scannedPages,
        pageDocuments,
        discoveryMeta: scanPlan?.discoveryMeta,
        deep: await analyzeBrandVoiceDeep(websiteUrl, allText, writingSamples, scannedPages),
      });
    } catch (err) {
      logger.warn({ err, attempt }, "Brand scrape parse error");
      if (attempt === 2) throw err;
    }
  }

  throw new Error("Failed to extract brand profile after retries");
}
