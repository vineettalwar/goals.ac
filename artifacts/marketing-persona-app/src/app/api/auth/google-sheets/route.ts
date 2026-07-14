import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireSiteAdmin } from "@/lib/auth/require-site-admin";
import { startGoogleSheetsOAuth } from "@/lib/integrations/oauth/google-sheets-oauth";

export async function GET(req: Request) {
  const { userId, error } = await requireSiteAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const projectId = Number(url.searchParams.get("projectId"));
  const sourceId = Number(url.searchParams.get("sourceId"));
  if (isNaN(projectId) || isNaN(sourceId)) {
    return NextResponse.json(
      { error: "projectId and sourceId query params are required" },
      { status: 400 },
    );
  }

  try {
    return await startGoogleSheetsOAuth(projectId, sourceId, userId!);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Google Sheets OAuth failed" },
      { status: 503 },
    );
  }
}
