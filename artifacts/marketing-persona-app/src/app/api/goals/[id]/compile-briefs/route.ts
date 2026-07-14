import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { briefsTable, goalsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/org/org-access";
import { compileBriefsFromGoal } from "@workspace/content-engine/goal-brief-compiler";
import { loadUserAiSettings } from "@/lib/content/content-pieces-helpers";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const goalId = Number((await params).id);
  if (isNaN(goalId)) return NextResponse.json({ error: "Invalid goal id" }, { status: 400 });

  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, goalId)).limit(1);
  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const access = await requireProjectAccess(goal.projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId!);
  const billingPrep = await prepareAiBilling({
    userId: userId!,
    tier: "planning",
    quotaKind: "article",
    companyId: goal.projectId,
  });
  if (!billingPrep.ok) return billingPrep.response;

  try {
    const compiled = await compileBriefsFromGoal(goal, {
      projectId: goal.projectId,
      userId: userId!,
      userApiKey,
      aiProviderOptions,
    });

    const inserted = await db
      .insert(briefsTable)
      .values(
        compiled.briefs.map((draft) => ({
          goalId: goal.id,
          workingTitle: draft.workingTitle,
          targetKeywordCluster: draft.targetKeywordCluster,
          searchIntent: draft.searchIntent,
          funnelStage: draft.funnelStage,
          angle: draft.angle,
          format: draft.format,
          wordCount: draft.wordCount,
          successMetric: draft.successMetric,
          status: "draft",
        })),
      )
      .returning();

    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      eventType: "brief_compilation",
      usedByok: billingPrep.usedByok,
      tier: "planning",
      companyId: goal.projectId,
      promptTokens: compiled.generationUsage?.promptTokens,
      outputTokens: compiled.generationUsage?.outputTokens,
      totalTokens: compiled.generationUsage?.totalTokens,
    });

    return NextResponse.json({ briefs: inserted }, { status: 201 });
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx, err instanceof Error ? err.message : "brief_compilation_failed");
    const message = err instanceof Error ? err.message : "Brief compilation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
