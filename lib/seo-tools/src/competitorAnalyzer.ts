import {
  modelForProviderTier,
  resolveAiClient,
  resolveProviderId,
  type AiProviderOptions,
} from "@workspace/ai-providers";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { analyzeHtml } from "./site-audit/page-analyzer";
import { runSiteAuditCrawl } from "./site-audit/crawl";
import type { CrawledPage } from "./site-audit/types";

export type ThreatLevel = "low" | "medium" | "high";

export type CompetitorEvidencePage = {
  url: string;
  title: string | null;
  h1: string | null;
  h2s: string[];
  schemaTypes: string[];
  wordCountBucket: "thin" | "medium" | "long";
};

export type CompetitorAnalysisResult = {
  competitorName: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  contentGaps: string[];
  geoGaps: string[];
  quickWins: string[];
  threatLevel: ThreatLevel;
  evidencePages: CompetitorEvidencePage[];
  crawlPartial: boolean;
};

export class CompetitorUnreachableError extends Error {
  readonly status = 422;
  constructor(message = "Could not fetch the competitor site") {
    super(message);
    this.name = "CompetitorUnreachableError";
  }
}

export const COMPETITOR_CRAWL_MAX_PAGES = 6;

export function wordCountBucket(wordCount: number): CompetitorEvidencePage["wordCountBucket"] {
  if (wordCount < 300) return "thin";
  if (wordCount < 1200) return "medium";
  return "long";
}

export function evidenceFromCrawledPage(page: CrawledPage): CompetitorEvidencePage | null {
  if (page.fetchClass !== "ok" || !page.isHtml) return null;
  return {
    url: page.url,
    title: page.title,
    h1: page.h1Text,
    h2s: page.h2s,
    schemaTypes: page.schemaTypes,
    wordCountBucket: wordCountBucket(page.wordCount),
  };
}

export function extractPageEvidence(html: string, url: string): CompetitorEvidencePage {
  const crawled = analyzeHtml({
    html,
    pageUrl: url,
    statusCode: 200,
    responseTimeMs: 0,
    redirectUrl: null,
    xRobotsTag: null,
    linkHeader: null,
    crawlDepth: 0,
    fromSitemap: false,
    pageId: "evidence",
  });
  return evidenceFromCrawledPage(crawled) ?? {
    url,
    title: null,
    h1: null,
    h2s: [],
    schemaTypes: [],
    wordCountBucket: "thin",
  };
}

export async function scrapeCompetitorText(url: string): Promise<string> {
  await assertPublicUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GoalsAC-Analyzer/1.0)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 6000);
  } finally {
    clearTimeout(timeout);
  }
}

export async function gatherCompetitorEvidence(
  startUrl: string,
  options?: { fetchImpl?: typeof fetch; maxPages?: number },
): Promise<{ pages: CompetitorEvidencePage[]; crawlPartial: boolean }> {
  const maxPages = options?.maxPages ?? COMPETITOR_CRAWL_MAX_PAGES;
  const result = await runSiteAuditCrawl({
    startUrl,
    maxPages,
    fetchImpl: options?.fetchImpl,
  });
  const start = result.pages[0];
  if (!start || start.fetchClass !== "ok" || !start.isHtml) {
    throw new CompetitorUnreachableError(
      "Could not fetch the competitor homepage. Analysis needs live page content.",
    );
  }
  const pages = result.pages
    .map((page) => evidenceFromCrawledPage(page))
    .filter((page): page is CompetitorEvidencePage => page != null);
  if (pages.length === 0) {
    throw new CompetitorUnreachableError("Competitor homepage returned no readable content.");
  }
  return {
    pages,
    crawlPartial: !result.crawlComplete || pages.length < result.pages.length,
  };
}

export async function analyzeCompetitor(params: {
  competitorUrl: string;
  industry: string;
  location: string;
  stage: string;
  userApiKey?: string | null;
  aiProviderOptions?: AiProviderOptions;
}): Promise<CompetitorAnalysisResult> {
  const { competitorUrl, industry, location, stage, userApiKey, aiProviderOptions } = params;

  const { pages, crawlPartial } = await gatherCompetitorEvidence(competitorUrl);
  const client = await resolveAiClient(userApiKey, aiProviderOptions);

  const evidenceJson = JSON.stringify(
    pages.map((p) => ({
      url: p.url,
      title: p.title,
      h1: p.h1,
      h2s: p.h2s,
      schemaTypes: p.schemaTypes,
      wordCountBucket: p.wordCountBucket,
    })),
  );

  const prompt = `You are a competitive intelligence analyst for B2B startups. Analyze this competitor for a ${industry} startup in ${location} at the ${stage} stage.

Competitor start URL: ${competitorUrl}
Crawled page evidence (JSON). contentGaps must be short topic strings taken from headings that are missing versus typical ${industry} coverage — do not invent keywords that do not follow from these headings:
${evidenceJson}

Respond ONLY with a valid JSON object in this exact shape:
{
  "competitorName": "string",
  "summary": "2-3 sentence overview of what they do and who they target",
  "strengths": ["up to 4 specific strengths based on the crawled pages"],
  "weaknesses": ["up to 4 specific weaknesses or gaps you can exploit"],
  "contentGaps": ["up to 4 topic strings from missing vs present headings"],
  "geoGaps": ["up to 3 AI/GEO visibility gaps — schema, structured data, FAQ, etc."],
  "quickWins": ["up to 4 actionable tactics to outrank or out-position them in 90 days"],
  "threatLevel": "low" | "medium" | "high"
}

Base every claim on the evidence pack. Cite page titles or H1s in strengths/weaknesses when you can.`;

  const providerId = resolveProviderId(aiProviderOptions);
  const model = modelForProviderTier(providerId, "strategy");
  const response = await client.generate({
    prompt,
    model,
    responseMimeType: "application/json",
  });

  const raw = response.text ?? "{}";
  try {
    const parsed = JSON.parse(raw) as CompetitorAnalysisResult;
    return {
      ...parsed,
      evidencePages: pages,
      crawlPartial,
    };
  } catch {
    throw new Error("Failed to parse analysis response");
  }
}
