import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import {
  syncGscSearchAnalytics,
  getGscSyncStatus,
} from "@workspace/content-engine/analytics/gsc-search-analytics-service";
import { discoverOpportunities } from "@workspace/content-engine/strategy/keyword-opportunity-service";
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
    `gsc-sync:${projectId}`,
    RATE_LIMITS.GSC_SYNC_PER_PROJECT.limit,
    RATE_LIMITS.GSC_SYNC_PER_PROJECT.windowMs,
  );
  if (limited) return limited;

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await req.json().catch(() => ({}));
  const asyncMode = body?.async === true;

  try {
    if (asyncMode) {
      await enqueue(QUEUES.gscSearchAnalyticsSync, { projectId, userId: userId! });
      return NextResponse.json({ queued: true }, { status: 202 });
    }

    const result = await syncGscSearchAnalytics(projectId);
    const inserted = await discoverOpportunities(projectId, userId!, { sources: ["gsc"] });
    return NextResponse.json({ ...result, opportunitiesInserted: inserted });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "GSC sync failed" },
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

  const status = await getGscSyncStatus(projectId);
  return NextResponse.json(status);
}
