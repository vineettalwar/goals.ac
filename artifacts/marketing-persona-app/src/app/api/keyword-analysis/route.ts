import { NextResponse } from "next/server";
import { z } from "zod";
import { getAiClient } from "@/lib/ai/gemini-client";
import { getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const KeywordAnalysisBody = z.object({
  keywords: z.array(z.string().min(1).max(200)).min(1).max(10),
  websiteUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  const limited = rateLimitResponse(
    `ai-gen:ip:${getClientIp(req)}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs
  );
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = KeywordAnalysisBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request: " + parsed.error.message }, { status: 400 });
  }

  const { keywords, websiteUrl } = parsed.data;

  try {
    const client = getAiClient();

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
    try {
      const analysis = JSON.parse(raw);
      return NextResponse.json(analysis);
    } catch {
      return NextResponse.json({ error: "Failed to parse analysis response" }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
