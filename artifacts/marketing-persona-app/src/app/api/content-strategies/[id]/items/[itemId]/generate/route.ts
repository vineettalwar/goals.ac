import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentStrategiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/org/org-access";
import { generateFromContentItem } from "@workspace/content-engine/autopilot-orchestrator";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/user-api-key";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/user-ai-provider";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { enqueue, QUEUES } from "@workspace/jobs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const strategyId = Number((await params).id);
  const itemId = Number((await params).itemId);
  if (isNaN(strategyId) || isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [strategy] = await db
    .select()
    .from(contentStrategiesTable)
    .where(eq(contentStrategiesTable.id, strategyId))
    .limit(1);

  if (!strategy) return NextResponse.json({ error: "Content strategy not found" }, { status: 404 });
  if (!strategy.websiteProjectId) {
    return NextResponse.json({ error: "Strategy is not linked to a project" }, { status: 400 });
  }

  const access = await requireProjectAccess(strategy.websiteProjectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json().catch(() => ({}));
  const generateVariants = body?.generateVariants !== false;
  const asyncMode = body?.async === true;

  if (asyncMode) {
    await enqueue(QUEUES.contentGenerate, {
      contentItemId: itemId,
      projectId: strategy.websiteProjectId,
      userId: userId!,
      generateVariants,
    });
    return NextResponse.json({ queued: true, contentItemId: itemId }, { status: 202 });
  }

  const [userApiKey, aiProviderOptions] = await Promise.all([
    getDecryptedUserGeminiKey(userId!),
    getUserAiProviderOptions(userId!),
  ]);
  const billingPrep = await prepareAiBilling({
    userId: userId!,
    tier: "execution",
    quotaKind: "article",
  });
  if (!billingPrep.ok) return billingPrep.response;

  try {
    const result = await generateFromContentItem(
      itemId,
      strategy.websiteProjectId,
      userId!,
      { generateVariants, userApiKey, aiProviderOptions },
    );
    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      eventType: "content_generation",
      usedByok: billingPrep.usedByok,
      tier: "execution",
      promptTokens: result.generationUsage?.promptTokens,
      outputTokens: result.generationUsage?.outputTokens,
      totalTokens: result.generationUsage?.totalTokens,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx, err instanceof Error ? err.message : "generation_failed");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 502 },
    );
  }
}
