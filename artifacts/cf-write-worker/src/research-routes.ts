import { withCors } from "@workspace/cf-edge/cors";
import { db } from "@workspace/db";
import {
  brandProfilesTable,
  contentPiecesTable,
  seoArticlesTable,
  websiteProjectsTable,
} from "@workspace/db/schema-sqlite";
import { cleanAndParse } from "@workspace/content-engine/core/utils";
import { rateLimitResponse, RATE_LIMITS } from "@workspace/content-engine/core/rate-limit";
import { resolveAiClientForUser } from "@workspace/content-engine/support/ai/resolve-ai-client-for-user";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/ai/user-api-key";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/ai/user-ai-provider";
import {
  searchRedditThreads,
  type RedditSearchHit,
} from "@workspace/content-engine/social/reddit-public-search";
import { persistRedditOpportunities } from "@workspace/content-engine/strategy/keyword-opportunity-service";
import { generateTopicalMap } from "@workspace/content-engine/strategy/topical-map-generator";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "./ai-billing";
import { requireProjectAccess } from "./project-access";

const redditDiscoveryBody = z.object({ projectId: z.number().int().positive() });
const topicalMapBody = z.object({ websiteProjectId: z.number().int().positive() });

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

type ScrapeData = {
  companyName?: string;
  industry?: string;
  targetAudience?: string;
};

function keywordTerms(
  brand: { primaryKeywords?: string[] | null } | undefined,
  projectName: string,
): string[] {
  const fromBrand = brand?.primaryKeywords?.slice(0, 5) ?? [];
  if (fromBrand.length > 0) return fromBrand;
  return projectName
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 3);
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

async function handleRedditDiscovery(
  request: Request,
  userId: number,
): Promise<Response> {
  const limited = await rateLimitResponse(
    `reddit-disc:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return withCors(request, limited);

  const parsed = redditDiscoveryBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return withCors(request, Response.json({ error: "projectId required" }, { status: 400 }));
  }

  const access = await requireProjectAccess(parsed.data.projectId, userId);
  if (!access.ok) {
    return withCors(request, Response.json({ error: access.error }, { status: access.status }));
  }

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
    return withCors(request, Response.json({ threads: [], keywords, source: "reddit" }));
  }

  const billingPrep = await prepareAiBilling({
    userId,
    tier: "rapid",
    quotaKind: "article",
  });
  if (!billingPrep.ok) return withCors(request, billingPrep.response);

  let client: Awaited<ReturnType<typeof resolveAiClientForUser>>["client"];
  try {
    ({ client } = await resolveAiClientForUser(userId));
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx, "ai_unavailable");
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("not configured") ||
      msg.includes("No Gemini API key") ||
      msg.includes("failed to initialize")
    ) {
      return withCors(
        request,
        Response.json(
          {
            error: "ai_unavailable",
            message:
              "No AI provider configured. Set your provider in Settings or configure AI_PROVIDER and provider credentials.",
          },
          { status: 503 },
        ),
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
      const data = cleanAndParse<{ replies: Array<{ index: number; suggestedReply: string }> }>(
        text,
      );
      replies = data.replies ?? [];
    } catch {
      await cancelAiBilling(billingPrep.ctx, "parse_failed");
      return withCors(request, Response.json({ error: "Failed to parse reply drafts" }, { status: 500 }));
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
      userId,
      eventType: "reddit_discovery",
      usedByok: billingPrep.usedByok,
      tier: "rapid",
    });

    let opportunitiesInserted = 0;
    try {
      opportunitiesInserted = await persistRedditOpportunities(projectId, threads, keywords);
    } catch {
      // discovery still succeeds even if opportunity persist fails
    }

    return withCors(
      request,
      Response.json({ threads, keywords, source: "reddit", opportunitiesInserted }),
    );
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx, err instanceof Error ? err.message : "generation_failed");
    return withCors(request, Response.json({ error: "Reddit discovery failed" }, { status: 500 }));
  }
}

async function handleTopicalMap(request: Request, userId: number): Promise<Response> {
  const limited = await rateLimitResponse(
    `ai-gen:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return withCors(request, limited);

  const parsed = topicalMapBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
  }

  const { websiteProjectId } = parsed.data;

  const access = await requireProjectAccess(websiteProjectId, userId);
  if (!access.ok) {
    return withCors(request, Response.json({ error: access.error }, { status: access.status }));
  }

  const [project] = await db
    .select()
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, websiteProjectId))
    .limit(1);

  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const [brand] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, websiteProjectId))
    .limit(1);

  const scrapeData = project.scrapeData as ScrapeData | null;

  const companyData = {
    name: brand?.companyName ?? scrapeData?.companyName ?? project.name,
    industry: brand?.industry ?? scrapeData?.industry ?? "",
    description: "",
    targetAudience: brand?.targetAudience ?? scrapeData?.targetAudience ?? "",
    websiteUrl: project.url,
  };

  const [pieces, seoArticles] = await Promise.all([
    db
      .select({ title: contentPiecesTable.title })
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.websiteProjectId, websiteProjectId)),
    db
      .select({ title: seoArticlesTable.title })
      .from(seoArticlesTable)
      .where(eq(seoArticlesTable.websiteProjectId, websiteProjectId)),
  ]);

  const existingTitles = [...pieces, ...seoArticles]
    .map((row) => row.title)
    .filter((title): title is string => Boolean(title));

  const billingPrep = await prepareAiBilling({
    userId,
    tier: "planning",
    quotaKind: "article",
  });
  if (!billingPrep.ok) return withCors(request, billingPrep.response);

  try {
    const [userApiKey, aiProviderOptions] = await Promise.all([
      getDecryptedUserGeminiKey(userId),
      getUserAiProviderOptions(userId),
    ]);

    const result = await generateTopicalMap(
      {
        company: companyData,
        existingArticleTitles: existingTitles,
      },
      { userApiKey, aiProviderOptions },
    );

    await completeAiBilling(billingPrep.ctx, {
      userId,
      eventType: "topical_map",
      usedByok: billingPrep.usedByok,
      tier: "planning",
      promptTokens: result.generationUsage?.promptTokens,
      outputTokens: result.generationUsage?.outputTokens,
      totalTokens: result.generationUsage?.totalTokens,
    });

    return withCors(request, Response.json({ map: result }));
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx, "generation_failed");
    console.error("[topical-map]", err);
    return withCors(request, Response.json({ error: "Failed to generate topical map" }, { status: 500 }));
  }
}

export async function handleResearchWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path === "/api/reddit-discovery" && request.method === "POST") {
    return handleRedditDiscovery(request, userId);
  }
  if (path === "/api/topical-map" && request.method === "POST") {
    return handleTopicalMap(request, userId);
  }
  return null;
}
