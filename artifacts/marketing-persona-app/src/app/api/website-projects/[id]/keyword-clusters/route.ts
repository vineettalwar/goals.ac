import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { buildKeywordClusters } from "@workspace/content-engine/strategy/keyword-cluster-service";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";

const Body = z.object({
  seeds: z.array(z.string().min(1).max(200)).min(1).max(10),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const limited = await rateLimitResponse(
    `ai-gen:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return limited;

  const { id: idStr } = await params;
  const projectId = Number(idStr);
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide 1–10 seed keywords" }, { status: 400 });
  }

  const billingPrep = await prepareAiBilling({
    userId: userId!,
    tier: "planning",
    quotaKind: "article",
  });
  if (!billingPrep.ok) {
    return billingPrep.response;
  }

  try {
    const result = await buildKeywordClusters({
      projectId,
      userId: userId!,
      seeds: parsed.data.seeds,
    });
    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      eventType: "keyword_cluster",
      usedByok: billingPrep.usedByok,
      tier: "planning",
      promptTokens: result.generationUsage?.promptTokens,
      outputTokens: result.generationUsage?.outputTokens,
      totalTokens: result.generationUsage?.totalTokens,
    });
    return NextResponse.json(result);
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx, "error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cluster generation failed" },
      { status: 502 },
    );
  }
}
