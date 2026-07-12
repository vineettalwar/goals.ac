import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { companiesTable, marketingPersonasTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { resolveAiClientForUser } from "@workspace/content-engine/support/resolve-ai-client-for-user";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/user-ai-provider";
import { resolveProviderId } from "@workspace/ai-providers";
import { cleanAndParse } from "@/lib/ai/utils";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { aiProviderUnavailableMessage } from "@/lib/ai-providers-status";

const schema = z.object({
  companyId: z.number(),
  contentGoal: z.string().max(280).optional(),
  tonePreference: z.string().max(80).optional(),
  focusArea: z.string().max(160).optional(),
  count: z.number().int().min(3).max(10).optional(),
});

type TopicIdea = {
  title: string;
  primaryKeyword: string;
  searchIntent: "informational" | "navigational" | "commercial" | "transactional";
  difficulty: "low" | "medium" | "high";
  whyItMatters: string;
  refinementPointers: string[];
  angle: string;
};

type TopicIdeasResponse = {
  ideas: TopicIdea[];
};

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const limited = rateLimitResponse(
    `ai-gen:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs
  );
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [company] = await db
    .select()
    .from(companiesTable)
    .where(and(eq(companiesTable.id, parsed.data.companyId), eq(companiesTable.userId, userId!)))
    .limit(1);

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const [persona] = await db
    .select()
    .from(marketingPersonasTable)
    .where(and(eq(marketingPersonasTable.companyId, company.id), eq(marketingPersonasTable.isActive, true)))
    .limit(1);

  const count = parsed.data.count ?? 6;
  const aiProviderOptions = await getUserAiProviderOptions(userId!);
  const resolvedProviderId = resolveProviderId(aiProviderOptions);

  let clientConfig;
  try {
    clientConfig = await resolveAiClientForUser(userId!);
  } catch {
    return NextResponse.json(
      {
        error: "ai_unavailable",
        message: aiProviderUnavailableMessage(resolvedProviderId),
        provider: resolvedProviderId,
      },
      { status: 503 },
    );
  }

  const { client, source, providerId } = clientConfig;

  const prompt = `You are a senior SEO content strategist for ${company.name} (${company.industry}).
Company URL: ${company.websiteUrl}
Company description: ${company.description}
Target audience: ${company.targetAudience}
Competitors: ${company.competitorUrls.join(", ") || "Not provided"}
Active persona: ${
    persona
      ? `${persona.name} (${persona.jobTitle}) | Pain points: ${persona.painPoints.slice(0, 3).join("; ")} | Goals: ${persona.goals.slice(0, 2).join("; ")}`
      : "Not provided"
  }

User's stated content goal: ${parsed.data.contentGoal ?? "Generate balanced top-of-funnel and middle-of-funnel SEO opportunities."}
Tone preference: ${parsed.data.tonePreference ?? "Professional and practical"}
Focus area: ${parsed.data.focusArea ?? "No specific focus"}

Generate exactly ${count} topic ideas for high-quality long-form SEO articles.
Return STRICT JSON with shape:
{
  "ideas": [
    {
      "title": "string",
      "primaryKeyword": "string",
      "searchIntent": "informational|navigational|commercial|transactional",
      "difficulty": "low|medium|high",
      "whyItMatters": "1-2 sentence rationale",
      "refinementPointers": ["pointer 1", "pointer 2", "pointer 3"],
      "angle": "specific angle to make article differentiated"
    }
  ]
}

Constraints:
- Ideas must be practical and non-generic.
- Avoid duplicate intent/keywords.
- Prioritize topics that can convert within 3-6 months.
- refinementPointers must be actionable and concise.`;

  try {
    const response = await client.generate({
      prompt,
      responseMimeType: "application/json",
      maxOutputTokens: 4096,
      thinkingBudget: 1024,
    });

    const parsedIdeas = cleanAndParse<TopicIdeasResponse>(response.text);
    const ideas = Array.isArray(parsedIdeas.ideas) ? parsedIdeas.ideas.slice(0, count) : [];

    return NextResponse.json({
      ideas,
      generation: { source, provider: providerId },
    });
  } catch {
    return NextResponse.json(
      {
        error: "generation_failed",
        message: aiProviderUnavailableMessage(providerId),
        provider: providerId,
      },
      { status: 503 },
    );
  }
}
