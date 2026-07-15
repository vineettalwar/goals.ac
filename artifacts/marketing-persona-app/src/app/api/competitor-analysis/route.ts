import { NextResponse } from "next/server";
import { db, competitorAnalysesTable } from "@workspace/db";
import { analyzeCompetitor } from "@workspace/seo-tools/competitorAnalyzer";
import { assertPublicUrlSync } from "@workspace/security/ssrf-guard";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { loadUserAiSettings } from "@/lib/content/content-pieces-helpers";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { z } from "zod";

const AnalyzeBody = z.object({
  competitorUrl: z.string().url(),
  industry: z.string().min(1),
  location: z.string().min(1),
  stage: z.string().min(1),
  websiteProjectId: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = AnalyzeBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  try {
    assertPublicUrlSync(parsed.data.competitorUrl);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid URL" }, { status: 400 });
  }

  if (parsed.data.websiteProjectId) {
    const access = await requireProjectAccess(parsed.data.websiteProjectId, userId!);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const [{ userApiKey, aiProviderOptions }, billingPrep] = await Promise.all([
    loadUserAiSettings(userId!),
    prepareAiBilling({
    userId: userId!,
    tier: "planning",
    quotaKind: "article",
  }),  ]);
  if (!billingPrep.ok) return billingPrep.response;

  try {
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
      userId: userId!,
      eventType: "competitor_analysis",
      usedByok: billingPrep.usedByok,
      tier: "planning",
    });

    return NextResponse.json(saved);
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx, err instanceof Error ? err.message : "analysis_failed");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 },
    );
  }
}
