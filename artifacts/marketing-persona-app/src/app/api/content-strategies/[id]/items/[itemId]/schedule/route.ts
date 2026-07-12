import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentStrategiesTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { parseAutopilotSettings, shouldAutoPublish } from "@workspace/content-engine/support/autopilot-scheduler";
import { enqueue, QUEUES } from "@workspace/jobs";

export async function POST(
  _req: Request,
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

  if (!strategy?.websiteProjectId) {
    return NextResponse.json({ error: "Strategy is not linked to a project" }, { status: 400 });
  }

  const [proj] = await db
    .select({ autopilotSettings: websiteProjectsTable.autopilotSettings })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, strategy.websiteProjectId), eq(websiteProjectsTable.userId, userId!)))
    .limit(1);

  if (!proj) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const settings = parseAutopilotSettings(proj.autopilotSettings);

  await enqueue(QUEUES.contentGenerate, {
    contentItemId: itemId,
    projectId: strategy.websiteProjectId,
    userId: userId!,
    generateVariants: true,
    schedulePublish: shouldAutoPublish(settings),
  });

  return NextResponse.json({ queued: true, contentItemId: itemId }, { status: 202 });
}
