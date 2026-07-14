import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { brandProfilesTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { resolveAiClientForUser } from "@workspace/content-engine/support/resolve-ai-client-for-user";
import { cleanAndParse } from "@/lib/ai/utils";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";

const Body = z.object({ projectId: z.number().int().positive() });

type RedditThread = {
  subreddit: string;
  title: string;
  url: string;
  intentScore: number;
  suggestedReply: string;
};

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const limited = await rateLimitResponse(
    `reddit-disc:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const access = await requireProjectAccess(parsed.data.projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const [project] = await db
    .select()
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, parsed.data.projectId))
    .limit(1);

  const [brand] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, parsed.data.projectId))
    .limit(1);

  const keywords = brand?.primaryKeywords?.slice(0, 5).join(", ") ?? project?.name ?? "B2B SaaS";
  const industry = brand?.industry ?? "B2B";
  const audience = brand?.targetAudience ?? "";

  const billingPrep = await prepareAiBilling({
    userId: userId!,
    tier: "planning",
    quotaKind: "article",
  });
  if (!billingPrep.ok) return billingPrep.response;

  let client: Awaited<ReturnType<typeof resolveAiClientForUser>>["client"];
  try {
    ({ client } = await resolveAiClientForUser(userId!));
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx, "ai_unavailable");
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("not configured") ||
      msg.includes("No Gemini API key") ||
      msg.includes("failed to initialize")
    ) {
      return NextResponse.json(
        {
          error: "ai_unavailable",
          message:
            "No AI provider configured. Set your provider in Settings or configure AI_PROVIDER and provider credentials in .env.local.",
        },
        { status: 503 },
      );
    }
    throw err;
  }

  const prompt = `Find 6 realistic Reddit discussion opportunities for a ${industry} company.
Keywords: ${keywords}
Audience: ${audience}
Website: ${project?.url ?? ""}

Return JSON: { "threads": [{ "subreddit": "r/name", "title": "thread title", "url": "https://reddit.com/r/...", "intentScore": 1-100, "suggestedReply": "helpful 2-3 sentence reply draft" }] }
Use plausible subreddit names and search-style thread titles. intentScore reflects buyer intent. Do not invent fake Reddit URLs with specific post IDs — use search URLs like https://www.reddit.com/r/subreddit/search/?q=keyword`;

  try {
    const response = await client.generate({
      prompt,
      responseMimeType: "application/json",
      maxOutputTokens: 4096,
    });

    const text = response.text ?? "";
    let threads: RedditThread[] = [];
    try {
      const data = cleanAndParse<{ threads: RedditThread[] }>(text);
      threads = data.threads ?? [];
    } catch {
      await cancelAiBilling(billingPrep.ctx, "parse_failed");
      return NextResponse.json({ error: "Failed to parse Reddit discovery results" }, { status: 500 });
    }

    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      eventType: "reddit_discovery",
      usedByok: billingPrep.usedByok,
      tier: "planning",
    });

    return NextResponse.json({ threads });
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx, err instanceof Error ? err.message : "generation_failed");
    return NextResponse.json({ error: "Reddit discovery failed" }, { status: 500 });
  }
}
