import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { optionalAuth } from "../lib/auth";
import { getGeminiClientWithFallback } from "@workspace/ai-providers";
import { getDecryptedUserGeminiKey } from "../lib/userApiKey";

const router: IRouter = Router();

const KeywordAnalysisBody = z.object({
  keywords: z.array(z.string().min(1).max(200)).min(1).max(10),
  websiteUrl: z.string().url().optional(),
});

router.post("/keyword-analysis", optionalAuth, async (req, res) => {
  const parsed = KeywordAnalysisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request: " + parsed.error.message });
    return;
  }

  const { keywords, websiteUrl } = parsed.data;

  try {
    const userApiKey = req.user ? await getDecryptedUserGeminiKey(req.user.userId) : null;
    const result = await getGeminiClientWithFallback(userApiKey);
    if (!result) {
      res.status(503).json({ error: "Analysis temporarily unavailable" });
      return;
    }
    const { client } = result;

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

    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" },
    });

    const raw = response.text ?? "{}";
    let analysis: unknown;
    try {
      analysis = JSON.parse(raw);
    } catch {
      res.status(500).json({ error: "Failed to parse analysis response" });
      return;
    }

    res.json(analysis);
  } catch (err) {
    req.log.error({ err }, "Keyword analysis failed");
    res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;
