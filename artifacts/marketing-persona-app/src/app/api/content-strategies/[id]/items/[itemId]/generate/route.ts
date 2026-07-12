import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentStrategiesTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { generateFromContentItem } from "@workspace/content-engine/autopilot-orchestrator";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/user-api-key";
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

  const [proj] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, strategy.websiteProjectId), eq(websiteProjectsTable.userId, userId!)))
    .limit(1);

  if (!proj) return NextResponse.json({ error: "Access denied" }, { status: 403 });

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

  try {
    const userApiKey = await getDecryptedUserGeminiKey(userId!);
    const result = await generateFromContentItem(
      itemId,
      strategy.websiteProjectId,
      userId!,
      { generateVariants, userApiKey },
    );
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 502 },
    );
  }
}
