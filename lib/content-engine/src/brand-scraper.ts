import { getAiProviderClient } from "@workspace/ai-providers/client";
import type { BrandExtract, Confidence } from "./brand-extract-types";
import { sanitizeBrandExtract } from "./brand-extract-sanitize";
import { cleanAndParse } from "./utils";
import { logger } from "./logger";

export type { BrandExtract, Confidence } from "./brand-extract-types";

const SYSTEM_PROMPT = `You are an expert brand analyst. Given raw text scraped from a company's website, extract brand information and rate your confidence for each field. You MUST respond with a single valid JSON object and nothing else. No markdown code fences, no explanation — only raw JSON.`;

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; GoalsAC/1.0; +https://goals.ac)",
};

async function fetchPage(url: string): Promise<string | null> {
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

async function fetchPageText(url: string): Promise<string | null> {
  const html = await fetchPage(url);
  return html ? stripHtml(html) : null;
}

function stripHtml(html: string): string {
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
    .slice(0, 8000);
}

function extractInternalLinks(html: string, baseOrigin: string): string[] {
  const links: string[] = [];
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1];
    try {
      const url = href.startsWith("http") ? new URL(href) : new URL(href, baseOrigin);
      if (url.origin === baseOrigin) {
        links.push(url.href);
      }
    } catch {
      // skip invalid
    }
  }
  return [...new Set(links)];
}

function pickKeyPages(links: string[]): string[] {
  const keyPaths = ["about", "product", "products", "pricing", "solution", "solutions", "features", "platform", "services", "how-it-works", "company", "mission"];
  const picked: string[] = [];
  for (const keyword of keyPaths) {
    const match = links.find((l) => {
      try {
        const path = new URL(l).pathname.toLowerCase();
        return path.includes(keyword) && !path.includes("#") && !path.endsWith(".pdf");
      } catch {
        return false;
      }
    });
    if (match && !picked.includes(match)) {
      picked.push(match);
    }
    if (picked.length >= 2) break;
  }
  return picked;
}

function parseConfidence(val: unknown): Confidence {
  if (val === "high" || val === "medium" || val === "low") return val;
  return "medium";
}

export async function scrapeBrandProfile(websiteUrl: string): Promise<BrandExtract> {
  const origin = new URL(websiteUrl).origin;
  const homepageHtml = (await fetchPage(websiteUrl)) ?? "";

  const internalLinks = extractInternalLinks(homepageHtml, origin);
  const extraPages = pickKeyPages(internalLinks);

  const extraTexts = await Promise.all(extraPages.map((url) => fetchPageText(url)));
  const homepageText = stripHtml(homepageHtml);

  const allText = [homepageText, ...extraTexts.filter(Boolean)]
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
      });
    } catch (err) {
      logger.warn({ err, attempt }, "Brand scrape parse error");
      if (attempt === 2) throw err;
    }
  }

  throw new Error("Failed to extract brand profile after retries");
}
