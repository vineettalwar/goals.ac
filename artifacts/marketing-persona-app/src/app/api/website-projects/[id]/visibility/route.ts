import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  websiteProjectsTable,
  llmVisibilityPromptsTable,
  llmVisibilitySnapshotsTable,
  geoAuditsTable,
} from "@workspace/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { parseVisibilitySettings } from "@workspace/content-engine/support/visibility-settings";
import {
  seedPromptsForProject,
  runVisibilityCheckForProject,
} from "@workspace/content-engine/llm-visibility-service";
import {
  computeVisibilityScore,
  aggregateSnapshotsByDate,
} from "@workspace/seo-tools/llmVisibilityChecker";
import { enqueue, QUEUES } from "@workspace/jobs";

async function loadOwnedProject(projectId: number, userId: number) {
  const [project] = await db
    .select()
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId)))
    .limit(1);
  return project ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number((await params).id);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const project = await loadOwnedProject(projectId, userId!);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [snapshots, prompts, geoAudits] = await Promise.all([
    db
      .select()
      .from(llmVisibilitySnapshotsTable)
      .where(
        and(
          eq(llmVisibilitySnapshotsTable.websiteProjectId, projectId),
          gte(llmVisibilitySnapshotsTable.checkedAt, since),
        ),
      )
      .orderBy(desc(llmVisibilitySnapshotsTable.checkedAt)),
    db
      .select()
      .from(llmVisibilityPromptsTable)
      .where(eq(llmVisibilityPromptsTable.websiteProjectId, projectId)),
    db
      .select({
        id: geoAuditsTable.id,
        geoScore: geoAuditsTable.geoScore,
        createdAt: geoAuditsTable.createdAt,
      })
      .from(geoAuditsTable)
      .where(
        and(eq(geoAuditsTable.websiteProjectId, projectId), gte(geoAuditsTable.createdAt, since)),
      )
      .orderBy(desc(geoAuditsTable.createdAt)),
  ]);

  const latestBatch = snapshots.slice(0, prompts.length * 4);
  const citedLatest = latestBatch.filter((s) => s.cited).length;
  const visibilityScore = computeVisibilityScore(citedLatest, latestBatch.length || 1);

  const byEngine = ["chatgpt", "perplexity", "claude", "gemini"].map((engine) => {
    const engineSnaps = latestBatch.filter((s) => s.engine === engine);
    const cited = engineSnaps.filter((s) => s.cited).length;
    return {
      engine,
      cited,
      total: engineSnaps.length,
      score: computeVisibilityScore(cited, engineSnaps.length || 1),
    };
  });

  const competitorHeatmap = new Map<string, number>();
  for (const snap of latestBatch) {
    for (const comp of snap.competitorsMentioned ?? []) {
      competitorHeatmap.set(comp, (competitorHeatmap.get(comp) ?? 0) + 1);
    }
  }

  return NextResponse.json({
    settings: parseVisibilitySettings(project.visibilitySettings),
    visibilityScore,
    promptCount: prompts.filter((p) => p.isActive).length,
    trend: aggregateSnapshotsByDate(snapshots),
    byEngine,
    competitorMentions: [...competitorHeatmap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    geoScoreTrend: geoAudits
      .slice()
      .reverse()
      .map((a) => ({
        date: new Date(a.createdAt).toISOString().slice(0, 10),
        score: a.geoScore,
      })),
    latestGeoScore: geoAudits[0]?.geoScore ?? null,
    recentSnapshots: snapshots.slice(0, 20),
    // Legacy shape for simpler consumers
    score: { overall: visibilityScore, byEngine: Object.fromEntries(byEngine.map((e) => [e.engine, e.score])) },
    prompts,
    snapshots,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number((await params).id);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const project = await loadOwnedProject(projectId, userId!);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = (body as { action?: string }).action ?? "check";

  if (action === "seed") {
    const count = await seedPromptsForProject(projectId);
    return NextResponse.json({ seeded: count });
  }

  if (action === "check") {
    const result = await runVisibilityCheckForProject(projectId);
    return NextResponse.json(result);
  }

  if (action === "enqueue" || action === "check-async") {
    await enqueue(QUEUES.llmVisibilityCheck, { projectId });
    return NextResponse.json({ queued: true }, { status: 202 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
