import {
  modelForProviderTier,
  resolveAiClient,
  resolveProviderId,
  type AiProviderOptions,
} from "@workspace/ai-providers";

export type ThreatLevel = "low" | "medium" | "high";

export type CompetitorAnalysisResult = {
  competitorName: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  contentGaps: string[];
  geoGaps: string[];
  quickWins: string[];
  threatLevel: ThreatLevel;
};

export async function scrapeCompetitorText(url: string): Promise<string> {
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

export async function analyzeCompetitor(params: {
  competitorUrl: string;
  industry: string;
  location: string;
  stage: string;
  userApiKey?: string | null;
  aiProviderOptions?: AiProviderOptions;
}): Promise<CompetitorAnalysisResult> {
  const { competitorUrl, industry, location, stage, userApiKey, aiProviderOptions } = params;

  const client = await resolveAiClient(userApiKey, aiProviderOptions);

  let pageText = "";
  try {
    pageText = await scrapeCompetitorText(competitorUrl);
  } catch {
    pageText = "(Could not fetch competitor page — analysis will be based on URL and context only)";
  }

  const prompt = `You are a competitive intelligence analyst for B2B startups. Analyze the following competitor for a ${industry} startup in ${location} at the ${stage} stage.

Competitor URL: ${competitorUrl}
Competitor page content (truncated):
${pageText}

Respond ONLY with a valid JSON object in this exact shape:
{
  "competitorName": "string",
  "summary": "2-3 sentence overview of what they do and who they target",
  "strengths": ["up to 4 specific strengths based on the page"],
  "weaknesses": ["up to 4 specific weaknesses or gaps you can exploit"],
  "contentGaps": ["up to 4 content topics or keywords they are missing"],
  "geoGaps": ["up to 3 AI/GEO visibility gaps — schema, structured data, FAQ, etc."],
  "quickWins": ["up to 4 actionable tactics to outrank or out-position them in 90 days"],
  "threatLevel": "low" | "medium" | "high"
}

Base analysis on the actual page content. Be specific and tactical, not generic.`;

  const providerId = resolveProviderId(aiProviderOptions);
  const model = modelForProviderTier(providerId, "strategy");
  const response = await client.generate({
    prompt,
    model,
    responseMimeType: "application/json",
  });

  const raw = response.text ?? "{}";
  try {
    return JSON.parse(raw) as CompetitorAnalysisResult;
  } catch {
    throw new Error("Failed to parse analysis response");
  }
}
