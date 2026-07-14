import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import {
  syncSocialPostMetrics,
  getSocialMetricsSyncStatus,
  getSocialPerformance,
} from "@workspace/content-engine/social-metrics-service";
import { isValidSocialPlatform } from "@workspace/content-engine/platform-voice";
import { enqueue, QUEUES } from "@workspace/jobs";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import type { SocialPlatformId } from "@workspace/db/schema";

export async function GET(
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
  const days = Number(url.searchParams.get("days") ?? "30");

  const performance = await getSocialPerformance(projectId, { platform, days });
  return NextResponse.json(performance);
}
