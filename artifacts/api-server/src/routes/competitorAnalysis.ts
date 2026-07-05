import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { optionalAuth } from "../lib/auth";
import { getGeminiClientWithFallback } from "../lib/geminiClient";
import { getDecryptedUserGeminiKey } from "../lib/userApiKey";
import { assertPublicUrlSync } from "../lib/ssrf-guard";

const router: IRouter = Router();

const AnalyzeBody = z.object({
  competitorUrl: z.url("Must be a valid URL"),
  industry: z.string().min(1),
  location: z.string().min(1),
  stage: z.string().min(1),
});

async function scrapeCompetitorText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GoalsAC-Analyzer/1.0)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 6000);
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

router.post("/competitor-analysis", optionalAuth, async (req, res) => {
  const parsed = AnalyzeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request: " + parsed.error.message });
    return;
  }

  const { competitorUrl, industry, location, stage } = parsed.data;

  try {
    assertPublicUrlSync(competitorUrl);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid URL" });
    return;
  }

  try {
    const userApiKey = req.user ? await getDecryptedUserGeminiKey(req.user.userId) : null;
    const geminiResult = await getGeminiClientWithFallback(userApiKey);
    if (!geminiResult) {
      res.status(503).json({ error: "Analysis temporarily unavailable" });
      return;
    }
    const { client } = geminiResult;

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
    req.log.error({ err }, "Competitor analysis failed");
    res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;
