import type { GoogleGenAI } from "@google/genai";
import { logger } from "../lib/logger";

type Confidence = "high" | "medium" | "low";

export interface BrandExtract {
  companyName: string;
  industry: string;
  targetAudience: string;
  voiceTone: string;
  primaryKeywords: string[];
  competitorUrls: string[];
  confidence: {
    companyName: Confidence;
    industry: Confidence;
    targetAudience: Confidence;
    voiceTone: Confidence;
    primaryKeywords: Confidence;
    competitorUrls: Confidence;
  };
}

const SYSTEM_PROMPT = `You are an expert brand analyst. Given raw text scraped from a company's website, extract brand information and rate your confidence for each field. You MUST respond with a single valid JSON object and nothing else. No markdown code fences, no explanation — only raw JSON.`;

let aiClient: GoogleGenAI | null = null;

async function getAiClient(): Promise<GoogleGenAI | null> {
  if (aiClient) return aiClient;

  const integrationBaseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  const integrationApiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  const userApiKey = process.env.GEMINI_API_KEY;

  const { GoogleGenAI: GenAI } = await import("@google/genai");

  if (integrationBaseUrl && integrationApiKey) {
    aiClient = new GenAI({
      apiKey: integrationApiKey,
      httpOptions: { apiVersion: "", baseUrl: integrationBaseUrl },
    });
    return aiClient;
  }

  if (userApiKey) {
    aiClient = new GenAI({ apiKey: userApiKey });
    return aiClient;
  }

  return null;
}

async function fetchPageText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GoalsAC/1.0; +https://goals.ac)" },
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const html = await resp.text();
    return stripHtml(html);
  } catch {
    clearTimeout(timeout);
    return null;
  }
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

function pickKeyPages(links: string[], baseOrigin: string): string[] {
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

  const homepageController = new AbortController();
  const homepageTimeout = setTimeout(() => homepageController.abort(), 10000);
  let homepageHtml = "";
  try {
    const resp = await fetch(websiteUrl, {
      signal: homepageController.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GoalsAC/1.0; +https://goals.ac)" },
    });
    clearTimeout(homepageTimeout);
    if (resp.ok) {
      homepageHtml = await resp.text();
    }
  } catch {
    clearTimeout(homepageTimeout);
  }

  const internalLinks = extractInternalLinks(homepageHtml, origin);
  const extraPages = pickKeyPages(internalLinks, origin);

  const extraTexts = await Promise.all(extraPages.map((url) => fetchPageText(url)));
  const homepageText = stripHtml(homepageHtml);

  const allText = [homepageText, ...extraTexts.filter(Boolean)]
    .join("\n\n---\n\n")
    .slice(0, 12000);

  const ai = await getAiClient();
  if (!ai) {
    throw new Error("AI not configured");
  }

  const prompt = `Analyze this website text and extract brand information. Rate your confidence for each field based on how clearly it was found in the content. The website URL is: ${websiteUrl}

WEBSITE TEXT:
${allText}

Return ONLY this exact JSON structure. For confidence, use "high" (clearly stated in content), "medium" (inferred from context), or "low" (best guess with limited signal):

{
  "companyName": "<company name from the website>",
  "companyNameConfidence": "<high|medium|low>",
  "industry": "<specific industry/niche, e.g. 'B2B SaaS', 'E-commerce', 'FinTech', 'HR Tech'>",
  "industryConfidence": "<high|medium|low>",
  "targetAudience": "<2-3 sentences describing the ideal customer profile — their role, company size, pain points, and goals>",
  "targetAudienceConfidence": "<high|medium|low>",
  "voiceTone": "<describe the brand voice, e.g. 'Professional yet conversational, data-driven and direct'>",
  "voiceToneConfidence": "<high|medium|low>",
  "primaryKeywords": ["<keyword 1>", "<keyword 2>", "<keyword 3>", "<keyword 4>", "<keyword 5>"],
  "primaryKeywordsConfidence": "<high|medium|low>",
  "competitorUrls": ["<competitor URL if mentioned on site, otherwise empty array>"],
  "competitorUrlsConfidence": "<high|medium|low>"
}

Rules:
- companyName: Extract the actual company name, not a tagline
- industry: Be specific, not generic like "technology"
- targetAudience: Base this on the copy, not guesswork
- voiceTone: Reflect the actual tone of the writing
- primaryKeywords: Use terms the site itself emphasizes, 3-6 keywords
- competitorUrls: Only include if explicitly mentioned on the site; otherwise return []
- Confidence "high" = field value is explicitly stated or clearly evident; "medium" = reasonably inferred; "low" = guessed from limited signals`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.2,
          maxOutputTokens: 1200,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      const raw = response.text ?? "";
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(cleaned) as Record<string, unknown>;

      if (!parsed.companyName || !parsed.industry) {
        throw new Error("Incomplete brand extract");
      }

      return {
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
      };
    } catch (err) {
      logger.warn({ err, attempt }, "Brand scrape parse error");
      if (attempt === 2) throw err;
    }
  }

  throw new Error("Failed to extract brand profile after retries");
}
