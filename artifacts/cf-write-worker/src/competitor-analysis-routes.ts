import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import { competitorAnalysesTable } from "@workspace/db/schema-sqlite";
import { analyzeCompetitor } from "@workspace/seo-tools/competitorAnalyzer";
import { assertPublicUrlSync } from "@workspace/security/ssrf-guard";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/ai/user-api-key";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/ai/user-ai-provider";
import { z } from "zod";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "./ai-billing";
import { requireProjectAccess } from "./project-access";

const analyzeBody = z.object({
  competitorUrl: z.string().url(),
  industry: z.string().min(1),
  location: z.string().min(1),
  stage: z.string().min(1),
  websiteProjectId: z.number().int().positive().optional(),
});

export async function handleCompetitorAnalysisWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path !== "/api/competitor-analysis" || request.method !== "POST") {
    return null;
  }

  const parsed = analyzeBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return withCors(
      request,
      Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      ),
    );
  }

  try {
    assertPublicUrlSync(parsed.data.competitorUrl);
  } catch (err) {
    return withCors(
      request,
      Response.json({ error: err instanceof Error ? err.message : "Invalid URL" }, { status: 400 }),
    );
  }

  if (parsed.data.websiteProjectId) {
    const access = await requireProjectAccess(parsed.data.websiteProjectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }
  }

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

    const analysis = await analyzeCompetitor({
      competitorUrl: parsed.data.competitorUrl,
      industry: parsed.data.industry,
      location: parsed.data.location,
      stage: parsed.data.stage,
      userApiKey,
      aiProviderOptions,
    });

    const [saved] = await db
      .insert(competitorAnalysesTable)
      .values({
        competitorUrl: parsed.data.competitorUrl,
        industry: parsed.data.industry,
        location: parsed.data.location,
        stage: parsed.data.stage,
        websiteProjectId: parsed.data.websiteProjectId ?? null,
        result: analysis,
      })
      .returning();

    await completeAiBilling(billingPrep.ctx, {
      userId,
      eventType: "competitor_analysis",
      usedByok: billingPrep.usedByok,
      tier: "planning",
    });

    return withCors(
      request,
      Response.json({
        id: saved.id,
        competitorUrl: saved.competitorUrl,
        industry: saved.industry,
        location: saved.location,
        stage: saved.stage,
        websiteProjectId: saved.websiteProjectId,
        createdAt: saved.createdAt,
        ...analysis,
      }),
    );
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx, err instanceof Error ? err.message : "analysis_failed");
    return withCors(
      request,
      Response.json(
        { error: err instanceof Error ? err.message : "Analysis failed" },
        { status: 500 },
      ),
    );
  }
}
