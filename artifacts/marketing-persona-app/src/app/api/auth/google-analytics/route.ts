import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { startGoogleAnalyticsOAuth } from "@/lib/integrations/oauth/analytics-property-oauth";

export async function GET(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number(new URL(req.url).searchParams.get("projectId"));
  if (!Number.isInteger(projectId) || projectId < 1) {
    return NextResponse.json({ error: "projectId query param is required" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    return await startGoogleAnalyticsOAuth(projectId, userId!);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Google Analytics OAuth failed" },
      { status: 503 },
    );
  }
}
