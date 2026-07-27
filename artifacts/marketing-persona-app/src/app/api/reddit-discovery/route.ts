import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { brandProfilesTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { resolveAiClientForUser } from "@workspace/content-engine/support/ai/resolve-ai-client-for-user";
import { cleanAndParse } from "@/lib/ai/utils";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import {
  searchRedditThreads,
  type RedditSearchHit,
} from "@workspace/content-engine/social/reddit-public-search";
import { persistRedditOpportunities } from "@workspace/content-engine/strategy/keyword-opportunity-service";

const Body = z.object({ projectId: z.number().int().positive() });

type RedditThread = {
  subreddit: string;
  title: string;
  url: string;
  intentScore: number;
  suggestedReply: string;
  score: number;
  numComments: number;
  source: "reddit";
};

function keywordTerms(brand: { primaryKeywords?: string[] | null } | undefined, projectName: string): string[] {
  const fromBrand = brand?.primaryKeywords?.slice(0, 5) ?? [];
  if (fromBrand.length > 0) return fromBrand;
  return projectName.split(/\s+/).filter((w) => w.length > 2).slice(0, 3);
}

function intentScoreForHit(hit: RedditSearchHit, keywords: string[]): number {
  const titleLower = hit.title.toLowerCase();
  const keywordHits = keywords.filter((k) => titleLower.includes(k.toLowerCase())).length;
  const engagement = Math.min(
    40,
    Math.log10(Math.max(hit.score, 1) + 1) * 12 + Math.log10(Math.max(hit.numComments, 1) + 1) * 6,
  );
  const relevance = Math.min(60, keywordHits * 18 + (hit.numComments >= 5 ? 12 : 0));
  return Math.round(Math.min(100, engagement + relevance));
}

async function findRedditHits(keywords: string[], industry: string): Promise<RedditSearchHit[]> {
  const primaryQuery = keywords.slice(0, 3).join(" ");
  let hits = primaryQuery ? await searchRedditThreads(primaryQuery, 8) : [];
  if (hits.length === 0 && keywords[0]) {
    hits = await searchRedditThreads(keywords[0], 8);
  }
  if (hits.length === 0 && industry) {
    hits = await searchRedditThreads(`${industry} ${keywords[0] ?? ""}`.trim(), 6);
  }
  return hits.slice(0, 6);
}

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

  const [[project], [brand]] = await Promise.all([
    db
      .select()
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, parsed.data.projectId))
      .limit(1),
    db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, parsed.data.projectId))
      .limit(1),
  ]);

  const keywords = keywordTerms(brand, project?.name ?? "B2B SaaS");
  const industry = brand?.industry ?? "B2B";
  const audience = brand?.targetAudience ?? "";

  const hits = await findRedditHits(keywords, industry);
  if (hits.length === 0) {
    return NextResponse.json({ threads: [], keywords, source: "reddit" });
  }

  const billingPrep = await prepareAiBilling({
    userId: userId!,
    tier: "rapid",
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

  const threadBrief = hits.map((h, i) => ({
    index: i,
    subreddit: h.subreddit,
    title: h.title,
  }));

  const prompt = `Draft helpful Reddit replies for a ${industry} brand.
Keywords: ${keywords.join(", ")}
Audience: ${audience}
Website: ${project?.url ?? ""}

Threads (real Reddit posts — do not invent URLs):
${JSON.stringify(threadBrief)}

Return JSON: { "replies": [{ "index": 0, "suggestedReply": "2-3 sentence helpful reply, not salesy" }] }
One reply per thread index. Be conversational and value-first.`;

  try {
    const response = await client.generate({
      prompt,
      responseMimeType: "application/json",
      maxOutputTokens: 2048,
    });

    const text = response.text ?? "";
    let replies: Array<{ index: number; suggestedReply: string }> = [];
    try {
      const data = cleanAndParse<{ replies: Array<{ index: number; suggestedReply: string }> }>(text);
      replies = data.replies ?? [];
    } catch {
      await cancelAiBilling(billingPrep.ctx, "parse_failed");
      return NextResponse.json({ error: "Failed to parse reply drafts" }, { status: 500 });
    }

    const replyByIndex = new Map(replies.map((r) => [r.index, r.suggestedReply]));

    const threads: RedditThread[] = hits.map((hit, i) => ({
      subreddit: hit.subreddit.startsWith("r/") ? hit.subreddit : `r/${hit.subreddit}`,
      title: hit.title,
      url: hit.url,
      intentScore: intentScoreForHit(hit, keywords),
      suggestedReply:
        replyByIndex.get(i) ??
        "Share a concise, helpful perspective based on your experience — avoid pitching unless asked.",
      score: hit.score,
      numComments: hit.numComments,
      source: "reddit",
    }));

    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      eventType: "reddit_discovery",
      usedByok: billingPrep.usedByok,
      tier: "rapid",
    });

    let opportunitiesInserted = 0;
    try {
      opportunitiesInserted = await persistRedditOpportunities(
        parsed.data.projectId,
        threads,
        keywords,
      );
    } catch {
      // discovery still succeeds even if opportunity persist fails
    }

    return NextResponse.json({
      threads,
      keywords,
      source: "reddit",
      opportunitiesInserted,
    });
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx, err instanceof Error ? err.message : "generation_failed");
    return NextResponse.json({ error: "Reddit discovery failed" }, { status: 500 });
  }
}
