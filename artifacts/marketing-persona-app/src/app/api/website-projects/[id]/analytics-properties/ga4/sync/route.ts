import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { syncGa4PageMetrics, getGa4SyncStatus } from "@workspace/content-engine/analytics/ga4-analytics-service";
import { enqueue, QUEUES } from "@workspace/jobs";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const limited = await rateLimitResponse(
    `ga4-sync:${projectId}`,
    RATE_LIMITS.GA4_SYNC_PER_PROJECT.limit,
    RATE_LIMITS.GA4_SYNC_PER_PROJECT.windowMs,
  );
  if (limited) return limited;

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const background = new URL(req.url).searchParams.get("background") === "1";

  try {
    if (background) {
      await enqueue(QUEUES.ga4AnalyticsSync, { projectId, userId: userId! });
      return NextResponse.json({ queued: true }, { status: 202 });
    }

    const result = await syncGa4PageMetrics(projectId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "GA4 sync failed" },
      { status: 502 },
    );
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const status = await getGa4SyncStatus(projectId);
  return NextResponse.json(status);
}
