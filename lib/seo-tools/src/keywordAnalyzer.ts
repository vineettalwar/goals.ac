import {
  modelForProviderTier,
  resolveAiClient,
  resolveProviderId,
  type AiProviderOptions,
} from "@workspace/ai-providers";
import { getKeywordResearchProvider, formatVolume, type KeywordMetrics } from "@workspace/keyword-research-provider";

export type KeywordDifficulty = "low" | "medium" | "high";

export type KeywordResult = {
  keyword: string;
  estimatedVolume: string;
  difficulty: KeywordDifficulty;
  aiVisibility: number;
  opportunities: string[];
  suggestedContent: string;
};

export type KeywordAnalysisResult = {
  keywords: KeywordResult[];
  topOpportunity: string;
  summary: string;
};

export async function analyzeKeywords(params: {
  keywords: string[];
  websiteUrl?: string;
  userApiKey?: string | null;
  aiProviderOptions?: AiProviderOptions;
  semrushCredentials?: { apiKey: string; database: string } | null;
  languagePromptLine?: string;
}): Promise<KeywordAnalysisResult> {
  const {
    keywords,
    websiteUrl,
    userApiKey,
    aiProviderOptions,
    semrushCredentials,
    languagePromptLine,
  } = params;

  let semrushMetricsBlock = "";
  const metricsByKeyword = new Map<string, KeywordMetrics>();

  if (semrushCredentials?.apiKey) {
    try {
      const provider = getKeywordResearchProvider();
      const metrics = await provider.getKeywordMetrics({
        keywords,
        database: semrushCredentials.database,
        apiKey: semrushCredentials.apiKey,
      });
      for (const m of metrics) {
        metricsByKeyword.set(m.keyword.toLowerCase(), m);
      }
      if (metrics.length > 0) {
        semrushMetricsBlock = `\n\nUse these Semrush metrics as ground truth (do not invent different volumes or difficulty):
${JSON.stringify(
  metrics.map((m) => ({
    keyword: m.keyword,
    searchVolume: m.searchVolume,
    keywordDifficulty: m.keywordDifficulty,
    difficulty: m.difficulty,
    intents: m.intents,
  })),
)}`;
      }
    } catch {
      // fall back to AI-only estimates
    }
  }

  const client = await resolveAiClient(userApiKey, aiProviderOptions);

  const prompt = `You are an SEO and GEO (Generative Engine Optimization) analyst. Analyze these keywords for a B2B startup${websiteUrl ? ` with website ${websiteUrl}` : ""}.

Keywords to analyze: ${keywords.join(", ")}${semrushMetricsBlock}
${languagePromptLine ? `\n${languagePromptLine}\n` : ""}
Respond ONLY with a valid JSON object in this exact shape:
{
  "keywords": [
    {
      "keyword": "exact keyword string",
      "estimatedVolume": "e.g. 1,200/mo or 200-500/mo",
      "difficulty": "low" | "medium" | "high",
      "aiVisibility": <integer 0-100 representing how likely this keyword surfaces in AI answers>,
      "opportunities": ["2-3 specific actionable opportunities to rank for this keyword"],
      "suggestedContent": "one specific content piece title to create for this keyword"
    }
  ],
  "topOpportunity": "1-2 sentence description of the single best opportunity across all keywords",
  "summary": "2-3 sentence overall analysis of the keyword set"
}

Be specific and tactical. Base estimates on realistic B2B SaaS market data.`;

  const providerId = resolveProviderId(aiProviderOptions);
  const model = modelForProviderTier(providerId, "planning");
  const response = await client.generate({
    prompt,
    model,
    responseMimeType: "application/json",
  });

  const raw = response.text ?? "{}";
  try {
    const parsed = JSON.parse(raw) as KeywordAnalysisResult;
    if (metricsByKeyword.size === 0) return parsed;

    return {
      ...parsed,
      keywords: parsed.keywords.map((kw) => {
        const metrics = metricsByKeyword.get(kw.keyword.toLowerCase());
        if (!metrics) return kw;
        return {
          ...kw,
          estimatedVolume: formatVolume(metrics.searchVolume),
          difficulty: metrics.difficulty,
        };
      }),
    };
  } catch {
    throw new Error("Failed to parse analysis response");
  }
}
