import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import {
  syncSocialHistory,
  getSocialHistorySyncStatus,
} from "@workspace/content-engine/social-history-sync-service";
import { isValidSocialPlatform } from "@workspace/content-engine/platform-voice";
import { enqueue, QUEUES } from "@workspace/jobs";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import type { SocialPlatformId } from "@workspace/db/schema";

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
    `social-history-sync:${projectId}`,
    RATE_LIMITS.SOCIAL_HISTORY_SYNC_PER_PROJECT.limit,
    RATE_LIMITS.SOCIAL_HISTORY_SYNC_PER_PROJECT.windowMs,
  );
  if (limited) return limited;

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(req.url);
  const platformParam = url.searchParams.get("platform");
  const platform =
    platformParam && isValidSocialPlatform(platformParam)
      ? (platformParam as SocialPlatformId)
      : undefined;
  const background = url.searchParams.get("background") === "1";

  try {
    if (background) {
      await enqueue(QUEUES.socialHistorySync, { projectId, userId: userId!, platform });
      return NextResponse.json({ queued: true }, { status: 202 });
    }

    const results = await syncSocialHistory(projectId, userId!, platform);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Social history sync failed" },
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

  const status = await getSocialHistorySyncStatus(projectId);
  return NextResponse.json(status);
}
