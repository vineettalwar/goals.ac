import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import {
  brandProfilesTable,
  contentPiecesTable,
  seoArticlesTable,
  websiteProjectsTable,
} from "@workspace/db/schema-sqlite";
import { rateLimitResponse, RATE_LIMITS } from "@workspace/content-engine/core/rate-limit";
import { resolveAiClientForUser } from "@workspace/content-engine/support/ai/resolve-ai-client-for-user";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/ai/user-api-key";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/ai/user-ai-provider";
import { runRedditDiscovery } from "@workspace/content-engine/social/reddit-discovery";
import { generateTopicalMap } from "@workspace/content-engine/strategy/topical-map-generator";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "./ai-billing";
import { requireProjectAccess } from "./project-access";

const redditDiscoveryBody = z.object({ projectId: z.number().int().positive() });
const topicalMapBody = z.object({ websiteProjectId: z.number().int().positive() });

type ScrapeData = {
  companyName?: string;
  industry?: string;
  targetAudience?: string;
};

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

  type OkBilling = Extract<Awaited<ReturnType<typeof prepareAiBilling>>, { ok: true }>;
  const billing = { current: null as OkBilling | null };

  try {
    const result = await runRedditDiscovery({
      projectId: parsed.data.projectId,
      projectName: project?.name ?? "B2B SaaS",
      projectUrl: project?.url,
      industry: brand?.industry,
      audience: brand?.targetAudience,
      primaryKeywords: brand?.primaryKeywords,
      generate: async (prompt) => {
        const billingPrep = await prepareAiBilling({
          userId,
          tier: "rapid",
          quotaKind: "article",
        });
        if (!billingPrep.ok) {
          throw Object.assign(new Error("billing"), { response: billingPrep.response });
        }
        billing.current = billingPrep;
        try {
          const { client } = await resolveAiClientForUser(userId);
          const response = await client.generate({
            prompt,
            responseMimeType: "application/json",
            maxOutputTokens: 2048,
          });
          return response.text ?? "";
        } catch (err) {
          await cancelAiBilling(billingPrep.ctx, "ai_unavailable");
          billing.current = null;
          throw err;
        }
      },
    });

    if (billing.current && result.threads.length > 0) {
      await completeAiBilling(billing.current.ctx, {
        userId,
        eventType: "reddit_discovery",
        usedByok: billing.current.usedByok,
        tier: "rapid",
      });
    }

    return withCors(request, Response.json(result));
  } catch (err) {
    if (err && typeof err === "object" && "response" in err) {
      return withCors(request, (err as { response: Response }).response);
    }
    if (billing.current) {
      await cancelAiBilling(billing.current.ctx, err instanceof Error ? err.message : "generation_failed");
    }
    const msg = err instanceof Error ? err.message : "";
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
    if (msg.toLowerCase().includes("parse")) {
      return withCors(request, Response.json({ error: "Failed to parse reply drafts" }, { status: 500 }));
    }
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
