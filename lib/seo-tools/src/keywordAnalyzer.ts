import {
  getGeminiClientWithFallback,
  modelForTier,
  wrapGeminiClient,
  type AiProviderClient,
} from "@workspace/ai-providers";

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

async function resolveAiClient(userApiKey: string | null | undefined): Promise<AiProviderClient | null> {
  const geminiResult = await getGeminiClientWithFallback(userApiKey);
  if (!geminiResult) return null;
  return wrapGeminiClient(geminiResult.client);
}

export async function analyzeKeywords(params: {
  keywords: string[];
  websiteUrl?: string;
  userApiKey?: string | null;
}): Promise<KeywordAnalysisResult> {
  const { keywords, websiteUrl, userApiKey } = params;

  const client = await resolveAiClient(userApiKey);
  if (!client) {
    throw new Error("Analysis temporarily unavailable");
  }

  const prompt = `You are an SEO and GEO (Generative Engine Optimization) analyst. Analyze these keywords for a B2B startup${websiteUrl ? ` with website ${websiteUrl}` : ""}.

Keywords to analyze: ${keywords.join(", ")}

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

  const model = modelForTier("gemini", "planning");
  const response = await client.generate({
    prompt,
    model,
    responseMimeType: "application/json",
  });

  const raw = response.text ?? "{}";
  try {
    return JSON.parse(raw) as KeywordAnalysisResult;
  } catch {
    throw new Error("Failed to parse analysis response");
  }
}
